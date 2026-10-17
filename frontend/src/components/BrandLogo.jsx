const SIZE_CLASSES = {
  small: 'h-12',
  medium: 'h-20',
  large: 'h-32',
}

export default function BrandLogo({ size = 'medium', className = '' }) {
  return (
    <img
      src="/sankat-saathi-logo.png"
      alt="Sankat Saathi"
      className={`${SIZE_CLASSES[size] || SIZE_CLASSES.medium} w-auto rounded bg-white object-contain ${className}`}
    />
  )
}
