import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';
import { forwardRef, ComponentType } from 'react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

// Type guard to check if a value is a valid Lucide icon component
const isIconComponent = (value: unknown): value is ComponentType<LucideProps> => {
  return typeof value === 'function' || 
    (typeof value === 'object' && value !== null && '$$typeof' in value);
};

export const DynamicIcon = forwardRef<SVGSVGElement, DynamicIconProps>(
  ({ name, ...props }, ref) => {
    const IconComponent = (LucideIcons as unknown as Record<string, unknown>)[name];
    
    if (!IconComponent || !isIconComponent(IconComponent)) {
      const HelpCircle = LucideIcons.HelpCircle;
      return <HelpCircle ref={ref} {...props} />;
    }
    
    const Icon = IconComponent as ComponentType<LucideProps & { ref?: React.Ref<SVGSVGElement> }>;
    return <Icon ref={ref} {...props} />;
  }
);

DynamicIcon.displayName = 'DynamicIcon';
