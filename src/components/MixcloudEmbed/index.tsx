export function MixcloudEmbed({ src }: { src: string }) {
  return (
    <iframe
      width="100%"
      height="180"
      src={src}
      frameBorder={0}
      allow="encrypted-media; fullscreen; autoplay; idle-detection; speaker-selection; web-share"
    />
  )
}
