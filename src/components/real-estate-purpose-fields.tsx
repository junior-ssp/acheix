"use client";

import { useState } from "react";
import { normalizeRealEstatePurpose, realEstatePurposeLabels, realEstatePurposes, realEstateTypesByPurpose, type RealEstatePurpose } from "@/lib/real-estate-taxonomy";

export function RealEstatePurposeFields({ initialPurpose, initialType, onPurposeChange, onTypeChange }: { initialPurpose?: string | null; initialType?: string | null; onPurposeChange?: (purpose: RealEstatePurpose | "") => void; onTypeChange?: (type: string) => void }) {
  const normalizedInitialPurpose = normalizeRealEstatePurpose(initialPurpose);
  const [purpose, setPurpose] = useState<RealEstatePurpose | "">(normalizedInitialPurpose ?? "");
  const initialAllowed = normalizedInitialPurpose ? realEstateTypesByPurpose[normalizedInitialPurpose].includes(String(initialType)) : false;
  const [type, setType] = useState(initialAllowed ? String(initialType) : "");
  const types = purpose ? realEstateTypesByPurpose[purpose] : [];

  function changePurpose(next: string) {
    const normalized = normalizeRealEstatePurpose(next) ?? "";
    setPurpose(normalized);
    setType("");
    onPurposeChange?.(normalized);
    onTypeChange?.("");
  }

  return <>
    <label className="grid gap-1.5"><span className="text-xs font-black uppercase text-yellow-300">Finalidade *</span><select name="purpose" required value={purpose} onChange={(event) => changePurpose(event.target.value)} className="input"><option value="">Selecione a finalidade</option>{realEstatePurposes.map((item) => <option key={item} value={item}>{realEstatePurposeLabels[item]}</option>)}</select></label>
    {purpose ? <label className="grid gap-1.5"><span className="text-xs font-black uppercase text-yellow-300">Tipo do Imóvel *</span><select name="type" required value={type} onChange={(event) => { setType(event.target.value); onTypeChange?.(event.target.value); }} className="input"><option value="">Selecione o tipo</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
  </>;
}
