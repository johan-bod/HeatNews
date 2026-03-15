import { useState } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  imageSrc: string;
}

export default function FeatureCard({ title, description, imageSrc }: FeatureCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="group border border-ivory-200/10 rounded-xl bg-ivory-200/[0.02] overflow-hidden transition-all duration-300 hover:border-amber-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5">
      <div className="aspect-[16/10] overflow-hidden">
        {imgFailed ? (
          <div className="w-full h-full bg-ivory-200/[0.03] flex items-center justify-center">
            <span className="text-ivory-200/20 font-body text-sm">Screenshot coming soon</span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-xl font-semibold text-ivory-100 mb-2">{title}</h3>
        <p className="font-body text-sm text-ivory-200/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
