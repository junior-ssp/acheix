"use client";

import { useEffect, useMemo, useState } from "react";
import { CarFront, Palette, Settings2 } from "lucide-react";
import { categories } from "@/lib/constants";
import { IntegerInput } from "@/components/integer-input";

type Brand = { id: string; name: string; source?: string };
type Model = { id: string; name: string; fipeCode?: string | null };
type Version = { id: string; name: string; fipeCode?: string | null };
type VehicleType = "CAR" | "MOTORCYCLE" | "TRUCK" | "BICYCLE";

const fallbackBrandsByType: Record<VehicleType, Brand[]> = {
  CAR: [
    "Audi", "BMW", "BYD", "Caoa Chery", "Chevrolet", "Citroën", "Fiat", "Ford", "GWM", "Honda", "Hyundai", "JAC Motors", "Jeep", "Kia", "Mercedes-Benz", "Mitsubishi", "Nissan", "Peugeot", "Renault", "Tesla", "Toyota", "Volkswagen", "Volvo"
  ].map((name) => ({ id: `fallback:CAR:${name}`, name, source: "Catálogo" })),
  MOTORCYCLE: [
    "BMW", "Dafra", "Ducati", "Harley-Davidson", "Honda", "Kawasaki", "KTM", "Royal Enfield", "Shineray", "Suzuki", "Triumph", "Yamaha", "Zero Motorcycles"
  ].map((name) => ({ id: `fallback:MOTORCYCLE:${name}`, name, source: "Catálogo" })),
  TRUCK: [
    "Agrale", "DAF", "Ford Caminhões", "Iveco", "MAN", "Mercedes-Benz", "Scania", "Volkswagen Caminhões", "Volvo"
  ].map((name) => ({ id: `fallback:TRUCK:${name}`, name, source: "Catálogo" })),
  BICYCLE: [
    "Caloi", "Sense", "Oggi", "Specialized", "Trek", "Cannondale", "Lev", "Duos", "Machine Motors", "Two Dogs", "Outra"
  ].map((name) => ({ id: `fallback:BICYCLE:${name}`, name, source: "Catálogo" }))
};

const fallbackModelsByBrand: Record<string, string[]> = {
  Audi: ["A3", "A4", "Q3", "Q5", "e-tron"],
  BMW: ["320i", "X1", "X3", "G 310 R", "R 1250 GS", "S 1000 RR"],
  BYD: ["Dolphin", "Dolphin Mini", "Song Plus", "Seal", "Yuan Plus"],
  "Caoa Chery": ["Tiggo 5X", "Tiggo 7", "Tiggo 8", "Arrizo 6"],
  Chevrolet: ["Onix", "Tracker", "S10", "Cruze", "Spin"],
  Citroën: ["C3", "C4 Cactus", "Aircross"],
  Fiat: ["Argo", "Mobi", "Pulse", "Strada", "Toro"],
  Ford: ["Ka", "EcoSport", "Ranger", "Territory", "Maverick"],
  GWM: ["Haval H6", "Ora 03", "Tank 300"],
  Honda: ["Civic", "Fit", "City", "HR-V", "Biz", "CG 160", "CB 300F", "XRE 300", "PCX"],
  Hyundai: ["HB20", "Creta", "Tucson", "Santa Fe"],
  "JAC Motors": ["E-JS1", "E-JS4", "T40", "T60"],
  Jeep: ["Renegade", "Compass", "Commander"],
  Kia: ["Sportage", "Cerato", "Sorento", "Stonic"],
  "Mercedes-Benz": ["Classe A", "GLA", "Sprinter", "Accelo", "Atego", "Actros"],
  Mitsubishi: ["L200", "Pajero", "Outlander", "ASX"],
  Nissan: ["Kicks", "Versa", "Frontier", "Sentra"],
  Peugeot: ["208", "2008", "3008"],
  Renault: ["Kwid", "Sandero", "Duster", "Oroch"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Toyota: ["Corolla", "Hilux", "SW4", "Yaris", "Corolla Cross"],
  Volkswagen: ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Saveiro"],
  Volvo: ["XC40", "XC60", "FH", "FM", "VM"],
  Dafra: ["Citycom", "Horizon", "Apache", "Next"],
  Ducati: ["Monster", "Multistrada", "Panigale", "Scrambler"],
  "Harley-Davidson": ["Iron 883", "Fat Boy", "Street Bob", "Sportster"],
  Kawasaki: ["Ninja", "Z400", "Versys", "Vulcan"],
  KTM: ["Duke", "Adventure", "RC"],
  "Royal Enfield": ["Classic", "Meteor", "Himalayan", "Interceptor"],
  Shineray: ["Worker", "Jet", "Phoenix", "XY"],
  Suzuki: ["Burgman", "V-Strom", "GSX", "Yes"],
  Triumph: ["Tiger", "Bonneville", "Street Triple", "Speed Triple"],
  Yamaha: ["Factor", "Fazer", "MT-03", "MT-07", "NMax", "XJ6", "XTZ"],
  "Zero Motorcycles": ["S", "SR", "DS", "FX"],
  Caloi: ["E-Vibe", "Elite", "Explorer", "Atacama", "Vulcan"],
  Sense: ["Impulse", "Impact", "One", "Fun", "Activ"],
  Oggi: ["Big Wheel", "Hacker", "Float", "Cattura"],
  Specialized: ["Turbo", "Rockhopper", "Stumpjumper", "Sirrus"],
  Trek: ["Marlin", "Domane", "Powerfly", "Rail"],
  Cannondale: ["Trail", "Quick", "Moterra", "Scalpel"],
  Lev: ["E-bike urbana", "E-bike dobrável", "E-bike cargo"],
  Duos: ["Comfort", "Urban", "Mountain"],
  "Machine Motors": ["Beach", "Urban", "Mountain"],
  "Two Dogs": ["Pliage", "Comfort", "Mountain"],
  Outra: ["Bicicleta elétrica", "Bicicleta de pedal", "Bike urbana", "Mountain bike", "Speed"],
  Agrale: ["A8700", "A10000", "Marruá"],
  DAF: ["XF", "CF", "LF"],
  "Ford Caminhões": ["Cargo", "F-4000"],
  Iveco: ["Daily", "Tector", "Hi-Way", "S-Way"],
  MAN: ["TGX", "TGS", "Delivery"],
  Scania: ["P", "G", "R", "S"],
  "Volkswagen Caminhões": ["Delivery", "Constellation", "Meteor"]
};

const fallbackVersionsByModel: Record<string, string[]> = {
  Mobi: ["Mobi Easy", "Mobi Like", "Mobi Drive", "Mobi Trekking"],
  Argo: ["Argo Drive", "Argo Trekking", "Argo Precision", "Argo HGT"],
  Pulse: ["Pulse Drive", "Pulse Audace", "Pulse Impetus", "Pulse Abarth"],
  Strada: ["Strada Endurance", "Strada Freedom", "Strada Volcano", "Strada Ranch"],
  Toro: ["Toro Endurance", "Toro Freedom", "Toro Volcano", "Toro Ranch", "Toro Ultra"],
  Onix: ["Onix", "Onix LT", "Onix LTZ", "Onix Premier", "Onix RS"],
  HB20: ["HB20 Comfort", "HB20 Limited", "HB20 Platinum", "HB20 Sense"],
  Corolla: ["Corolla GLi", "Corolla XEi", "Corolla Altis", "Corolla Hybrid"],
  Hilux: ["Hilux Cabine Simples", "Hilux SR", "Hilux SRV", "Hilux SRX"],
  Gol: ["Gol", "Gol Trend", "Gol Track", "Gol Rallye"],
  Polo: ["Polo MPI", "Polo TSI", "Polo Comfortline", "Polo Highline", "Polo GTS"]
};

const colors = ["Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo", "Marrom", "Bege", "Dourado", "Laranja", "Outra"];
const fuels = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido", "GNV", "Outro"];
const gearboxes = ["Manual", "Automático", "Automatizado", "CVT", "Outro"];

export function VehicleFields({
  vehicleSubtype,
  onVehicleSubtypeChange
}: {
  vehicleSubtype: string;
  onVehicleSubtypeChange: (value: string) => void;
}) {
  const vehicleType = vehicleTypeFromSubtype(vehicleSubtype);
  const [brands, setBrands] = useState<Brand[]>(fallbackBrandsByType[vehicleType]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<number[]>(defaultYears());
  const [brandId, setBrandId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionId, setVersionId] = useState("");
  const [customBrand, setCustomBrand] = useState(false);
  const [customModel, setCustomModel] = useState(false);
  const [customVersion, setCustomVersion] = useState(false);

  useEffect(() => {
    setBrands(fallbackBrandsByType[vehicleType]);
    setBrandId("");
    setBrandName("");
    setModels([]);
    setModelId("");
    setModelName("");
    setVersions([]);
    setVersionId("");
    setCustomBrand(false);
    setCustomModel(false);
    setCustomVersion(false);
    setYears(defaultYears());
    if (vehicleType === "BICYCLE") return;
    fetch(`/api/vehicle-catalog?mode=brands&vehicleType=${vehicleType}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.brands) && data.brands.length) setBrands(data.brands);
      })
      .catch(() => null);
  }, [vehicleType]);

  useEffect(() => {
    setModels([]);
    setModelId("");
    setModelName("");
    setVersions([]);
    setVersionId("");
    setCustomModel(false);
    setCustomVersion(false);
    setYears(defaultYears());
    if (!brandId) return;

    if (brandId.startsWith("manual:")) return;
    if (brandId.startsWith("fallback:") || brandId.startsWith("manufacturer:")) {
      setModels((fallbackModelsByBrand[brandName] ?? []).map((name) => ({ id: `fallback:${name}`, name })));
      return;
    }

    fetch(`/api/vehicle-catalog?mode=models&vehicleType=${vehicleType}&brandId=${encodeURIComponent(brandId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.models) && data.models.length) setModels(data.models);
      })
      .catch(() => null);
  }, [brandId, brandName, vehicleType]);

  useEffect(() => {
    setVersions([]);
    setVersionId("");
    setCustomVersion(false);
    setYears(defaultYears());
    if (!modelName) return;

    if (modelId.startsWith("manual:")) return;
    if (modelId.startsWith("fallback:") || brandId.startsWith("fallback:") || brandId.startsWith("manufacturer:")) {
      const fallbackVersions = fallbackVersionsByModel[modelName] ?? [modelName];
      setVersions(fallbackVersions.map((name) => ({ id: `fallback:${name}`, name })));
      return;
    }

    fetch(`/api/vehicle-catalog?mode=versions&vehicleType=${vehicleType}&brandId=${encodeURIComponent(brandId)}&modelName=${encodeURIComponent(modelName)}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.versions) && data.versions.length) {
          setVersions(data.versions);
        }
      })
      .catch(() => null);
  }, [brandId, modelId, modelName, vehicleType]);

  useEffect(() => {
    setYears(defaultYears());
    if (!versionId || versionId.startsWith("fallback:")) return;
    fetch(`/api/vehicle-catalog?mode=years&modelId=${encodeURIComponent(versionId)}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.years) && data.years.length) setYears(data.years);
      })
      .catch(() => null);
  }, [versionId]);

  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === brandId), [brands, brandId]);
  const selectedVersion = useMemo(() => versions.find((version) => version.id === versionId), [versions, versionId]);

  return (
    <section className="rounded-2xl border border-yellow-300/20 bg-gradient-to-b from-neutral-950 to-neutral-900 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black">
          <CarFront size={22} />
        </span>
        <div>
          <h3 className="text-lg font-black text-white">Dados do Veículo</h3>
          <p className="text-sm text-neutral-400">Catálogo filtrado para {vehicleSubtype}.</p>
        </div>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Tipo de Veículo</span>
          <select name="type" value={vehicleSubtype} onChange={(event) => onVehicleSubtypeChange(event.target.value)} className="input">
            {categories.VEHICLE.map((item) => <option key={item}>{item}</option>)}
          </select>
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Marca</span>
          <select
            required
            name={customBrand ? undefined : "brand"}
            value={customBrand ? "__custom__" : brandName}
            onChange={(event) => {
              const option = event.currentTarget.selectedOptions[0];
              const isCustom = event.currentTarget.value === "__custom__";
              setCustomBrand(isCustom);
              setBrandId(isCustom ? "manual:brand" : option.dataset.id ?? "");
              setBrandName(isCustom ? "" : event.currentTarget.value);
            }}
            className="input"
          >
            <option value="">Selecione a marca</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.name} data-id={brand.id}>{brand.name}</option>
            ))}
            <option value="__custom__">Outra marca (digitar)</option>
          </select>
          {customBrand ? <input required autoFocus name="brand" value={brandName} onChange={(event) => setBrandName(event.currentTarget.value)} placeholder="Digite a marca" className="input" /> : null}
          <FieldHelper>{selectedBrand?.source ? `Fonte: ${selectedBrand.source}` : undefined}</FieldHelper>
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Modelo</span>
          <select
            required
            name={customModel ? undefined : "model"}
            value={customModel ? "__custom__" : modelName}
            onChange={(event) => {
              const option = event.currentTarget.selectedOptions[0];
              const isCustom = event.currentTarget.value === "__custom__";
              setCustomModel(isCustom);
              setModelId(isCustom ? "manual:model" : option.dataset.id ?? "");
              setModelName(isCustom ? "" : event.currentTarget.value);
            }}
            disabled={!brandName}
            className="input disabled:opacity-60"
          >
            <option value="">{brandName ? "Selecione o modelo" : "Escolha a marca primeiro"}</option>
            {models.map((model) => (
              <option key={model.id} value={model.name} data-id={model.id}>{model.name}</option>
            ))}
            <option value="__custom__">Outro modelo (digitar)</option>
          </select>
          {customModel ? <input required autoFocus name="model" value={modelName} onChange={(event) => setModelName(event.currentTarget.value)} placeholder="Digite o modelo" className="input" /> : null}
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Versao</span>
          <input type="hidden" name="fipeCode" value={selectedVersion?.fipeCode ?? ""} />
          <select
            required
            name={customVersion ? undefined : "version"}
            value={customVersion ? "__custom__" : selectedVersion?.name ?? ""}
            onChange={(event) => {
              const option = event.currentTarget.selectedOptions[0];
              const isCustom = event.currentTarget.value === "__custom__";
              setCustomVersion(isCustom);
              setVersionId(isCustom ? "manual:version" : option.dataset.id ?? "");
            }}
            disabled={!modelName}
            className="input disabled:opacity-60"
          >
            <option value="">{modelName ? "Selecione a versao" : "Escolha o modelo primeiro"}</option>
            {versions.map((version) => (
              <option key={version.id} value={version.name} data-id={version.id}>{version.name}</option>
            ))}
            <option value="__custom__">Outra versão (digitar)</option>
          </select>
          {customVersion ? <input required autoFocus name="version" placeholder="Digite a versão" className="input" /> : null}
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Ano</span>
          <select required name="year" className="input">
            <option value="">Selecione o ano</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="flex items-center gap-1 text-xs font-black uppercase text-yellow-300"><Palette size={13} /> Cor</span>
          <select name="color" className="input">
            <option value="">Selecione a cor</option>
            {colors.map((color) => <option key={color}>{color}</option>)}
          </select>
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="text-xs font-black uppercase text-yellow-300">Combustível</span>
          <select name="fuel" className="input">
            <option value="">Selecione o combustível</option>
            {fuels.map((fuel) => <option key={fuel}>{fuel}</option>)}
          </select>
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5">
          <span className="flex items-center gap-1 text-xs font-black uppercase text-yellow-300"><Settings2 size={13} /> Câmbio</span>
          <select name="gearbox" className="input">
            <option value="">Selecione o câmbio</option>
            {gearboxes.map((gearbox) => <option key={gearbox}>{gearbox}</option>)}
          </select>
          <FieldHelper />
        </label>

        <label className="grid min-w-0 content-start gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-black uppercase text-yellow-300">Quilometragem</span>
          <IntegerInput name="mileageKm" placeholder="Km" className="input" />
          <FieldHelper />
        </label>
      </div>
    </section>
  );
}

function vehicleTypeFromSubtype(subtype: string): VehicleType {
  const normalized = subtype.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("bicicleta")) return "BICYCLE";
  if (normalized.includes("moto")) return "MOTORCYCLE";
  if (normalized.includes("caminhao") || normalized.includes("onibus")) return "TRUCK";
  return "CAR";
}

function defaultYears() {
  const current = new Date().getFullYear() + 1;
  return Array.from({ length: current - 1900 + 1 }, (_, index) => current - index);
}

function FieldHelper({ children }: { children?: string }) {
  return <span className="block min-h-4 truncate text-[11px] leading-4 text-neutral-500">{children ?? ""}</span>;
}
