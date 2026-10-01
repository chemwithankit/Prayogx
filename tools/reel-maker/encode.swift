// PrayogX Reel Maker - encoder and probe, on macOS's own AVFoundation (no ffmpeg, nothing downloaded).
//
//   encode FRAMES_DIR AUDIO.wav OUT.mp4 FPS W H     JPEG/PNG frames (sorted by name) + a WAV track -> H.264 + AAC MP4
//   probe  IN.mp4                                   JSON: duration, size, fps, codecs, audio channels
//   frames IN.mp4 OUT_DIR t1,t2,...                 decodes the video at those times to PNGs (playability check)
//   audio  IN.mp4 OUT.wav                           decodes the MP4's own audio track to 16-bit PCM (audio validation)
//
// Audio: AAC-LC, 48 kHz stereo, 128 kbps (Instagram Reels: AAC, at most 48 kHz, 128 kbps); moov atom first.
//
// Compiled once by generate-reel.js into tools/reel-maker/.cache/ (git-ignored).
import AVFoundation
import AppKit

func fail(_ s: String) -> Never { FileHandle.standardError.write((s + "\n").data(using: .utf8)!); exit(1) }

func encode(_ dir: String, _ wav: String, _ out: String, _ fps: Int32, _ W: Int, _ H: Int) {
  let files = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? []).filter { $0.hasSuffix(".jpg") || $0.hasSuffix(".png") }.sorted()
  if files.isEmpty { fail("no frames in " + dir) }
  try? FileManager.default.removeItem(atPath: out)
  guard let w = try? AVAssetWriter(outputURL: URL(fileURLWithPath: out), fileType: .mp4) else { fail("cannot write " + out) }
  w.shouldOptimizeForNetworkUse = true
  let vin = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 14_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                      AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2, AVVideoExpectedSourceFrameRateKey: Int(fps),
                                      AVVideoAllowFrameReorderingKey: false]])   // no B-frames: no composition offset, no video edit list
  vin.expectsMediaDataInRealTime = false
  let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vin, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
  w.add(vin)
  // audio: the WAV decoded to PCM, re-encoded as AAC
  var reader: AVAssetReader? = nil, rout: AVAssetReaderTrackOutput? = nil, ain: AVAssetWriterInput? = nil
  if FileManager.default.fileExists(atPath: wav) {
    let asset = AVURLAsset(url: URL(fileURLWithPath: wav))
    if let tr = asset.tracks(withMediaType: .audio).first, let r = try? AVAssetReader(asset: asset) {
      let o = AVAssetReaderTrackOutput(track: tr, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
      r.add(o)
      let a = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 48000, AVEncoderBitRateKey: 128_000])
      a.expectsMediaDataInRealTime = false
      w.add(a); reader = r; rout = o; ain = a
    }
  }
  if !w.startWriting() { fail("startWriting: " + String(describing: w.error)) }
  w.startSession(atSourceTime: .zero)
  reader?.startReading()
  let cs = CGColorSpaceCreateDeviceRGB()
  var ai = 0, audioDone = (ain == nil)
  for (i, f) in files.enumerated() {
    // interleave: keep audio a little ahead of video
    while !audioDone && ain!.isReadyForMoreMediaData {
      if let sb = rout!.copyNextSampleBuffer() { ain!.append(sb); ai += 1; if CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb)) > Double(i) / Double(fps) + 1 { break } }
      else { ain!.markAsFinished(); audioDone = true }
    }
    while !vin.isReadyForMoreMediaData { usleep(500) }
    guard let img = NSImage(contentsOfFile: dir + "/" + f), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fail("cannot read " + f) }
    var pb: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pb)
    guard let buf = pb else { fail("no pixel buffer") }
    CVPixelBufferLockBaseAddress(buf, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    ctx.interpolationQuality = .high
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
    CVPixelBufferUnlockBaseAddress(buf, [])
    if !ad.append(buf, withPresentationTime: CMTime(value: Int64(i), timescale: fps)) { fail("append frame \(i): " + String(describing: w.error)) }
  }
  vin.markAsFinished()
  while !audioDone {
    while !ain!.isReadyForMoreMediaData { usleep(500) }
    if let sb = rout!.copyNextSampleBuffer() { ain!.append(sb) } else { ain!.markAsFinished(); audioDone = true }
  }
  let sem = DispatchSemaphore(value: 0)
  w.finishWriting { sem.signal() }
  sem.wait()
  if w.status != .completed { fail("encode failed: " + String(describing: w.error)) }
  print("{\"frames\": \(files.count), \"audioBuffers\": \(ai), \"out\": \"\(out)\"}")
}

func probe(_ path: String) {
  let a = AVURLAsset(url: URL(fileURLWithPath: path))
  let v = a.tracks(withMediaType: .video).first, s = a.tracks(withMediaType: .audio).first
  func codec(_ t: AVAssetTrack?) -> String {
    guard let t = t, let fd = t.formatDescriptions.first else { return "" }
    let c = CMFormatDescriptionGetMediaSubType(fd as! CMFormatDescription)
    return String(bytes: [UInt8((c >> 24) & 255), UInt8((c >> 16) & 255), UInt8((c >> 8) & 255), UInt8(c & 255)], encoding: .ascii) ?? "?"
  }
  var ch = 0, rate = 0.0
  if let s = s, let fd = s.formatDescriptions.first, let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(fd as! CMAudioFormatDescription) { ch = Int(asbd.pointee.mChannelsPerFrame); rate = asbd.pointee.mSampleRate }
  let abr = s?.estimatedDataRate ?? 0, vbr = v?.estimatedDataRate ?? 0, adur = s.map { CMTimeGetSeconds($0.timeRange.duration) } ?? 0
  let size = v?.naturalSize ?? .zero
  print("{\"duration\": \(CMTimeGetSeconds(a.duration)), \"width\": \(Int(size.width)), \"height\": \(Int(size.height)), \"fps\": \(v?.nominalFrameRate ?? 0), \"video\": \"\(codec(v))\", \"audio\": \"\(codec(s))\", \"channels\": \(ch), \"sampleRate\": \(rate), \"audioBitRate\": \(abr), \"videoBitRate\": \(vbr), \"audioDuration\": \(adur), \"playable\": \(a.isPlayable)}")
}

func frames(_ path: String, _ dir: String, _ times: [Double]) {
  let a = AVURLAsset(url: URL(fileURLWithPath: path))
  let gen = AVAssetImageGenerator(asset: a)
  gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
  try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
  for (i, t) in times.enumerated() {
    guard let cg = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) else { fail("cannot decode at \(t)") }
    let rep = NSBitmapImageRep(cgImage: cg)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: dir + "/probe\(i).png"))
  }
  print("{\"decoded\": \(times.count)}")
}

// the MP4's audio track, decoded by AVFoundation to interleaved 16-bit PCM, as a WAV file
func extractAudio(_ path: String, _ out: String) {
  let a = AVURLAsset(url: URL(fileURLWithPath: path))
  guard let tr = a.tracks(withMediaType: .audio).first else { fail("no audio track in " + path) }
  guard let r = try? AVAssetReader(asset: a) else { fail("cannot read " + path) }
  let o = AVAssetReaderTrackOutput(track: tr, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false,
                                                                AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2])
  r.add(o)
  if !r.startReading() { fail("startReading: " + String(describing: r.error)) }
  var pcm = Data()
  while let sb = o.copyNextSampleBuffer() {
    guard let bb = CMSampleBufferGetDataBuffer(sb) else { continue }
    let n = CMBlockBufferGetDataLength(bb)
    var chunk = Data(count: n)
    chunk.withUnsafeMutableBytes { p in _ = CMBlockBufferCopyDataBytes(bb, atOffset: 0, dataLength: n, destination: p.baseAddress!) }
    pcm.append(chunk)
  }
  if r.status != .completed { fail("audio decode failed: " + String(describing: r.error)) }
  func le32(_ v: UInt32) -> Data { var x = v.littleEndian; return Data(bytes: &x, count: 4) }
  func le16(_ v: UInt16) -> Data { var x = v.littleEndian; return Data(bytes: &x, count: 2) }
  var h = Data("RIFF".utf8); h += le32(UInt32(36 + pcm.count)); h += Data("WAVEfmt ".utf8)
  h += le32(16); h += le16(1); h += le16(2); h += le32(48000); h += le32(48000 * 4); h += le16(4); h += le16(16)
  h += Data("data".utf8); h += le32(UInt32(pcm.count))
  do { try (h + pcm).write(to: URL(fileURLWithPath: out)) } catch { fail("cannot write " + out) }
  print("{\"samples\": \(pcm.count / 4), \"seconds\": \(Double(pcm.count / 4) / 48000.0), \"out\": \"\(out)\"}")
}

let A = CommandLine.arguments
if A.count < 2 { fail("usage: encode|probe|frames ...") }
switch A[1] {
case "encode": encode(A[2], A[3], A[4], Int32(A[5])!, Int(A[6])!, Int(A[7])!)
case "probe": probe(A[2])
case "frames": frames(A[2], A[3], A[4].split(separator: ",").map { Double($0)! })
case "audio": extractAudio(A[2], A[3])
default: fail("unknown command " + A[1])
}
