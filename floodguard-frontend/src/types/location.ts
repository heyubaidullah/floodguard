export type SelectedLocationSource = 'preset' | 'map' | 'search'

export type SelectedLocation = {
  label: string
  latitude: number
  longitude: number
  zoneId: string
  postalCode?: string
  source: SelectedLocationSource
}
