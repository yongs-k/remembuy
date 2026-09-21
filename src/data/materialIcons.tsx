export function Icon({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className ?? ''}`}>{name}</span>
}

export const LOCATION_MATERIAL_ICON: Record<string, string> = {
  bathroom: 'bathtub',
  kitchen: 'soup_kitchen',
  laundry: 'local_laundry_service',
  closet: 'checkroom',
  vanity: 'brush',
  bedroom: 'bed',
  livingroom: 'weekend',
  entrance: 'roller_skating',
  medicine: 'medication',
  car: 'directions_car',
}
