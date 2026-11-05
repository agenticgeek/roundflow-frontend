import { useMemo } from 'react'
import { Field, Input, Select } from '@/components/ui'
import { modalInputClass } from '@/components/ui/modal'
import { recordModalsContent } from '@/content/record-modals'
import { useRounds } from '@/features/rounds/hooks/useRounds'
import { useServiceAreas } from '@/features/settings/hooks/useSettings'
import { settingsServiceAreasToRows } from '@/features/settings/lib/mappers'
import type { PropertyFieldsValue } from '@/features/customers/lib/property-fields'

/** Service areas, loaded — `noAreas` is true only once they have loaded and there are none. */
export function usePropertyFieldOptions(open: boolean) {
  const areasQuery = useServiceAreas(open)
  const roundsQuery = useRounds('ACTIVE', open)
  const areaOptions = useMemo(
    () => settingsServiceAreasToRows(areasQuery.data).map((area) => ({ value: area.id, label: area.name })),
    [areasQuery.data],
  )
  return {
    areaOptions,
    roundOptions: (roundsQuery.data ?? []).map((round) => ({ value: round.id, label: round.name })),
    noAreas: areasQuery.isSuccess && areaOptions.length === 0,
  }
}

export function PropertyFields({
  value,
  onChange,
  areaOptions,
  roundOptions,
}: {
  value: PropertyFieldsValue
  onChange: (patch: Partial<PropertyFieldsValue>) => void
  areaOptions: { value: string; label: string }[]
  roundOptions: { value: string; label: string }[]
}) {
  const copy = recordModalsContent.addProperty
  return (
    <>
      <Field label={copy.fields.address} required size="sm" labelWeight="medium">
        <Input inputSize="sm" value={value.address} onChange={(e) => onChange({ address: e.target.value })} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.postcode} required size="sm" labelWeight="medium">
        <Input inputSize="sm" value={value.postcode} onChange={(e) => onChange({ postcode: e.target.value })} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.serviceArea} required size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={value.serviceAreaId}
          onChange={(e) => onChange({ serviceAreaId: e.target.value })}
          options={[{ value: '', label: copy.areaPlaceholder }, ...areaOptions]}
          className={modalInputClass}
        />
      </Field>
      <Field label={copy.fields.price} required size="sm" labelWeight="medium">
        <Input inputSize="sm" inputMode="decimal" value={value.price} onChange={(e) => onChange({ price: e.target.value })} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.round} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={value.roundId}
          onChange={(e) => onChange({ roundId: e.target.value })}
          options={[{ value: '', label: copy.roundPlaceholder }, ...roundOptions]}
          className={modalInputClass}
        />
      </Field>
    </>
  )
}
