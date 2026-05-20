"use client";

import { useFormContext } from "react-hook-form";
import type { FieldValues, Path } from "react-hook-form";
import { OrgCombobox } from "@/components/admin/OrgCombobox";
import type { OrgType } from "@/lib/types/organization";

type Props<T extends FieldValues> = {
  label: string;
  nameField: Path<T>;     // e.g. "host" — the denormalized display string
  idField: Path<T>;       // e.g. "hostOrgId"
  typeFilter?: OrgType | OrgType[];
  createAsType?: OrgType;
  hint?: string;
};

// Drop-in row that lets the editor pick an org from /organizations and
// auto-fills the denormalized name field. The id and name move in lockstep
// — picking an org sets both, typing freely clears the id but keeps the name.
export function OrgLinkRow<T extends FieldValues>({
  label,
  nameField,
  idField,
  typeFilter,
  createAsType,
  hint,
}: Props<T>) {
  const { watch, setValue } = useFormContext<T>();
  // The watch types are loose-ish here because we route through Path<T>.
  // The runtime values are still strings (or undefined).
  const currentId = watch(idField) as unknown as string | undefined;
  const currentName = (watch(nameField) as unknown as string | undefined) ?? "";

  return (
    <div className="border border-border rounded-sm bg-cream-start/30 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-warm-gray tracking-wider uppercase">
          🏛 {label}
        </span>
        {hint ? (
          <span className="text-[10px] text-warm-gray/70">· {hint}</span>
        ) : null}
      </div>
      <OrgCombobox
        value={currentId}
        name={currentName}
        typeFilter={typeFilter}
        createAsType={createAsType}
        onChange={(id, name) => {
          // setValue with shouldDirty so autosave fires.
          setValue(idField, (id ?? "") as never, {
            shouldDirty: true,
            shouldValidate: false,
          });
          setValue(nameField, (name ?? "") as never, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
    </div>
  );
}
