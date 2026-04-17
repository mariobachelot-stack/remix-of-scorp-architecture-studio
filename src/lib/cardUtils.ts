import { CanvasEquipment, FONT_SIZE_VALUES } from '@/types/equipment';

interface Manufacturer {
  id: string;
  name: string;
}

/**
 * Calculates the automatic height for an equipment card in Expert mode,
 * based on what content is actually displayed.
 * Only called when the user has NOT set a manual customHeight.
 */
export const computeAutoCardHeight = (
  equipment: CanvasEquipment,
  manufacturers: Manufacturer[]
): number => {
  const fontSizes = equipment.fontSize ? FONT_SIZE_VALUES[equipment.fontSize] : FONT_SIZE_VALUES.medium;
  const basePadding = 16;
  const gap = 8;

  let height = basePadding * 2; // padding top + bottom

  // Header: icon + label + name (stacked)
  height += 40;
  height += gap;

  // Flexible content zone
  const manufacturerName = manufacturers.find(m => m.id === equipment.manufacturerId)?.name;
  if (manufacturerName) {
    height += fontSizes.detail + 4 + gap * 0.8; // manufacturer line
  }

  // Protocol badge (always present in expert mode)
  height += 24 + gap * 0.8;

  if (equipment.ipAddress) {
    height += fontSizes.detail + 2 + gap * 0.8; // IP address line
  }

  return Math.max(80, Math.ceil(height));
};
