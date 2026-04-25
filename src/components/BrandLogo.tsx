type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function BrandLogo({
  className = '',
  imageClassName = '',
  alt = 'Run-Neeti logo',
}: BrandLogoProps) {
  const rootClassName = ['brand-logo', className].filter(Boolean).join(' ');
  const imgClassName = ['brand-logo-image', imageClassName].filter(Boolean).join(' ');

  return (
    <span aria-hidden={alt ? undefined : true} className={rootClassName}>
      <img alt={alt} className={imgClassName} src="/run-neeti-mark.png" />
    </span>
  );
}
