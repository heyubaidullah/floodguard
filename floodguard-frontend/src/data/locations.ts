import type { SelectedLocation } from '../types/location'

export const PRESET_LOCATIONS: SelectedLocation[] = [
  { label: 'Riverwalk · Downtown', latitude: 29.4241, longitude: -98.4951, zoneId: '78205', postalCode: '78205', source: 'preset' },
  { label: 'Pearl District · Midstream', latitude: 29.444, longitude: -98.478, zoneId: '78212', postalCode: '78212', source: 'preset' },
  { label: 'Brook Hollow · North', latitude: 29.501, longitude: -98.521, zoneId: '78232', postalCode: '78232', source: 'preset' },
  { label: 'Medical Center · Northwest', latitude: 29.505, longitude: -98.574, zoneId: '78229', postalCode: '78229', source: 'preset' },
  { label: 'Mission Reach · South', latitude: 29.372, longitude: -98.486, zoneId: '78210', postalCode: '78210', source: 'preset' },
  { label: 'Southtown · River Bend', latitude: 29.407, longitude: -98.492, zoneId: '78204', postalCode: '78204', source: 'preset' },
]

export const DEFAULT_LOCATION: SelectedLocation = PRESET_LOCATIONS[0]
