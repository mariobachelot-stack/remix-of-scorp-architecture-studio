import { cn } from '@/lib/utils';
import { Protocol, PROTOCOL_LABELS } from '@/types/equipment';

interface ProtocolBadgeProps {
  protocol: Protocol;
  className?: string;
}

const protocolStyles: Record<Protocol, string> = {
  'none': 'bg-gray-50 text-gray-500 border-gray-200',
  'modbus-tcp': 'bg-blue-100 text-blue-700 border-blue-200',
  'modbus-rtu': 'bg-blue-50 text-blue-600 border-blue-100',
  'bacnet-ip': 'bg-orange-100 text-orange-700 border-orange-200',
  'bacnet-mstp': 'bg-orange-50 text-orange-600 border-orange-100',
  'lon': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'cloud-api': 'bg-teal-100 text-teal-700 border-teal-200',
  'ethernet': 'bg-gray-100 text-gray-600 border-gray-200',
  'lorawan': 'bg-sky-100 text-sky-700 border-sky-200',
  'Constructeur': 'bg-pink-100 text-pink-700 border-pink-200',
  'multi-protocole': 'bg-violet-100 text-violet-700 border-violet-200',
};

export const ProtocolBadge = ({ protocol, className }: ProtocolBadgeProps) => {
  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        protocolStyles[protocol],
        className
      )}
    >
      {PROTOCOL_LABELS[protocol]}
    </span>
  );
};
