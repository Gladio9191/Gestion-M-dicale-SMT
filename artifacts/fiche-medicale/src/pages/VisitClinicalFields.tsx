import { Input } from "@/components/ui/input";
type Form = Record<string,string>;
type Props = { form: Form; change: (key:string,value:string)=>void };
export const RISKS = [["S","Sédentaire"],["AR","Actif avec risque"],["ASR","Actif sans risque"]] as const;
export const CS_MT = ["OPHTALMO","ORL","PSY","CARDIO","CONTRE VISITE","NEURO","PNEUMO","TRAUMATO","URO","AUTRES"];
export const CS_MS = ["OPHTALMO","ORL","PSY","CARDIO","NEURO","PNEUMO","TRAUMATO","NEPHRO","URO","GYNÉCO","MÉDECINE GÉNÉRALE","INTERNE","AUTRES"];
export const RADIO = ["RX THORAX","RX GENOU","RX PIED","RX ÉPAULE","RX MAIN","RX BASSIN","MAMMOGRAPHIE","ÉCHOGRAPHIE","AUTRES EXAMENS"];
export const BIO: Record<string,string[]> = {
  "Hématologie":["NFS","Hémogramme","Réticulocytes"],
  "Glycémie":["GAJ","GPP","HbA1c","HGPO"],
  "Lipides":["Cholestérol total","HDL","LDL","Triglycérides"],
  "Rénal":["Urée","Créatinine","DFG estimé","Acide urique"],
  "Hépatique":["ASAT (TGO)","ALAT (TGP)","Gamma-GT","PAL","Bilirubine totale","Bilirubine directe","Bilirubine indirecte"],
  "Inflammation":["CRP","VS"],
  "Fer":["Fer sérique","Ferritine","Transferrine","Coefficient de saturation de la transferrine"],
  "Thyroïde":["TSHus","FT3","FT4"],
  "Ionogramme":["Sodium (Na+)","Potassium (K+)","Chlore (Cl−)","Bicarbonates"],
  "Phosphocalcique":["Calcémie","Phosphorémie","PTH"],
  "Vitamines":["Vitamine D (25-OH)","Vitamine B12","Vitamine B9"],
  "Hémostase":["TP","TCA","INR","Fibrinogène"],
  "Musculaire":["CPK (CK)","LDH"],
  "Pancréatique":["Amylasémie","Lipasémie"],
  "Protéines":["Protidémie","Albuminémie","Électrophorèse des protéines sériques"],
  "Urinaire":["ECBU","Protéinurie des 24 h","Microalbuminurie","Rapport albuminurie/créatininurie"],
  "Prostate":["PSA total","PSA libre"],
  "Cardiaque":["Troponine","BNP","NT-proBNP"],
  "Hormonal":["Testostérone","FSH","LH","Prolactine","Cortisol","Estradiol"],
  "Immunologique":["FAN","Facteur rhumatoïde (FR)","Anti-CCP","Anti-TPO","Anti-TG"],
  "Infectieux":["ASLO","Hémoculture"],
  "Sérologique":["Ag HBs","Ac anti-HBs","Ac anti-HBc","Ac anti-VHC","VIH","TPHA","VDRL"],
  "Parasitologique":["Examen parasitologique des selles"],
  "Bactériologique":["Coproculture","Prélèvement de gorge","Culture et antibiogramme"],
  "Immuno-hématologique":["Groupage ABO/Rhésus","RAI"],
  "Allergologique":["IgE totales","IgE spécifiques"],
  "Grossesse":["β-HCG"],
  "Tuberculose":["IGRA (QuantiFERON)"],
  "Surveillance biologique professionnelle":["Plombémie","ALA urinaire","Carboxyhémoglobine (HbCO)","Méthémoglobinémie","Mercuriémie","Mercure urinaire","Cadmiurie","Cadmiémie","Chromurie","Nickel urinaire","Acide S-phénylmercapturique urinaire","Acide trans,trans-muconique urinaire","Acides méthylhippuriques urinaires","Ortho-crésol urinaire","Cholinestérases"],
  "Suivi des traitements / autres":["AUTRES ANALYSES"]
};
function Selector({title,items,value,change,custom=[]}:{title:string;items:string[];value:string;change:(v:string)=>void;custom?:string[]}) {
  const selected=value.split("\n").filter(Boolean);
  return <fieldset className="rounded-md border border-border p-3 space-y-2"><legend className="text-xs font-medium">{title}</legend>
    <div className="flex flex-wrap gap-2">{items.map(item=><label key={item} className="flex items-center gap-1 text-xs border rounded px-2 py-1"><input type="checkbox" checked={selected.includes(item)||selected.some(x=>x.startsWith(item+" : "))} onChange={e=>change(e.target.checked?[...selected,item].join("\n"):selected.filter(x=>x!==item&&!x.startsWith(item+" : ")).join("\n"))}/>{item}</label>)}</div>
    {custom.filter(item=>selected.some(x=>x===item||x.startsWith(item+" : "))).map(item=><Input key={item} aria-label={item} placeholder={item+" — préciser"} value={selected.find(x=>x.startsWith(item+" : "))?.slice(item.length+3)??""} onChange={e=>change(selected.map(x=>x===item||x.startsWith(item+" : ")?item+" : "+e.target.value:x).join("\n"))}/>)}
    {selected.filter(x=>!items.some(i=>x===i||x.startsWith(i+" : "))).map((x,i)=><div key={i} className="text-xs flex gap-2"><span className="flex-1">{x}</span><button type="button" onClick={()=>change(selected.filter(y=>y!==x).join("\n"))}>Retirer</button></div>)}
  </fieldset>;
}
export function VisitClinicalFields({form,change}:Props) {
 const clinical=["Examen médical par le médecin","Prise de TA","Spirométrie","Audiogramme","Visio-test"];
 const details=form.examensCliniques??"";
 return <div className="space-y-3">
 <div><label className="text-xs">Examens cliniques / Explorations (infirmerie)</label>
 <div className="flex flex-wrap gap-1 my-2">{clinical.map(x=><button key={x} type="button" className="border rounded px-2 py-1 text-xs" onClick={()=>change("examensCliniques",details?details+"\n"+x+" : ":x+" : ")}>{x}</button>)}</div>
 <textarea className="w-full min-h-24 border rounded p-2 text-sm" value={details} onChange={e=>change("examensCliniques",e.target.value)} /></div>
 <div><label className="text-xs">Observations</label><textarea className="w-full min-h-16 border rounded p-2 text-sm" value={form.observations??""} onChange={e=>change("observations",e.target.value)}/></div>
 <Selector title="CS MT" items={CS_MT} value={form.orientationMt??""} change={v=>change("orientationMt",v)} custom={["AUTRES"]}/>
 <Selector title="CS MS" items={CS_MS} value={form.orientationMs??""} change={v=>change("orientationMs",v)} custom={["AUTRES"]}/>
 {form.orientationSoins&&<p className="text-xs whitespace-pre-wrap">Orientation historique (conservée) : {form.orientationSoins}</p>}
 <Selector title="Examens radiologiques" items={RADIO} value={form.examenRadio??""} change={v=>change("examenRadio",v)} custom={["ÉCHOGRAPHIE","AUTRES EXAMENS"]}/>
 <fieldset className="border border-border rounded p-3"><legend className="text-xs font-medium">Bilans biologiques — sélection multiple</legend>
 {Object.entries(BIO).map(([category,items])=><details key={category} className="border-b py-2"><summary className="cursor-pointer text-sm">{category} ({items.filter(x=>(form.bilan??"").split("\n").some(y=>y===x||y.startsWith(x+" : "))).length})</summary><div className="mt-2 flex flex-wrap gap-2">{items.map(x=><label key={x} className="flex gap-1 text-xs"><input type="checkbox" checked={(form.bilan??"").split("\n").some(y=>y===x||y.startsWith(x+" : "))} onChange={e=>{const old=(form.bilan??"").split("\n").filter(Boolean);change("bilan",e.target.checked?[...old,x].join("\n"):old.filter(y=>y!==x&&!y.startsWith(x+" : ")).join("\n"));}}/>{x}</label>)}</div></details>)}
 <textarea aria-label="Bilans sélectionnés et précisions" className="w-full min-h-16 border rounded p-2 text-sm mt-2" value={form.bilan??""} onChange={e=>change("bilan",e.target.value)} placeholder="Analyses sélectionnées et précisions libres"/>
 </fieldset>
 <div><label className="text-xs">Décision médicale</label><select className="w-full border rounded p-2 text-sm" value={form.decisionAptitude??""} onChange={e=>change("decisionAptitude",e.target.value)}><option value="">— Non définie —</option><option value="APTE">APTE</option><option value="APTE_SOUS_RESERVE">APTE SOUS RÉSERVE</option><option value="INAPTE">INAPTE</option></select></div>
 {form.decisionAptitude==="APTE_SOUS_RESERVE"&&<Selector title="Réserves" items={["Apte au sol","Apte dans un poste sédentaire","Apte dans le périmètre urbain seulement","Apte pour la conduite des VS légers seulement","AUTRES"]} value={form.aptitudeDetails??""} change={v=>change("aptitudeDetails",v)} custom={["AUTRES"]}/>}
 {form.decisionAptitude==="INAPTE"&&<Selector title="Inaptitude" items={["Totale","HE","HCVS","Travail en hauteur","Travail de nuit","AUTRES"]} value={form.aptitudeDetails??""} change={v=>change("aptitudeDetails",v)} custom={["AUTRES"]}/>}
 <div><label className="text-xs">Décision médicale — texte intégral manuscrit</label><textarea className="w-full min-h-32 border rounded p-2 text-sm" value={form.decisionManuscrite??""} onChange={e=>change("decisionManuscrite",e.target.value)} /></div>
 </div>;
}
