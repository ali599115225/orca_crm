"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { useApp } from "@/app/context/AppContext";

type Readiness = {
  score: number;
  ready: boolean;
  checks: {
    priced: boolean;
    described: boolean;
    media: boolean;
    documents: boolean;
    location: boolean;
    coordinates: boolean;
    virtualTour: boolean;
  };
};

type UnitRow = {
  id: string;
  unitNumber: string;
  floorPosition: number;
  price: number;
  type: string;
  area: string;
  beds: number | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  agentName: string | null;
  description: string;
  media: unknown[];
  docs: unknown[];
  mediaCount: number;
  documentCount: number;
  tourType: string | null;
  tourUrl: string | null;
  status: string;
  projectId: string;
  projectName: string;
  projectCity: string;
  contractId: string | null;
  contractStatus: string | null;
  tourCount: number;
  offerCount: number;
  opportunityCount: number;
  readiness: Readiness;
  createdAt: string;
  updatedAt: string;
};

type ProjectOption = {
  id: string;
  name: string;
  city: string;
  status: string;
  unitsTotal: number;
  unitsSold: number;
  unitsBooked: number;
};

const EMPTY_STATS = { total: 0, available: 0, held: 0, soldOrLeased: 0, marketingReady: 0, virtualTours: 0, inventoryValue: 0 };
const STATUS_OPTIONS = ["", "Available", "Hold", "Reserved", "Sold", "Leased", "Maintenance"];

function money(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value || 0);
}
function statusLabel(value: string, ar: boolean) {
  const map: Record<string,[string,string]> = {
    Available:["متاحة","Available"], Hold:["قيد الحجز","On hold"], Reserved:["محجوزة","Reserved"], Sold:["مباعة","Sold"], Leased:["مؤجرة","Leased"], Maintenance:["صيانة","Maintenance"],
  };
  const item=map[value]||[value,value]; return ar?item[0]:item[1];
}
function statusClass(value:string){
  if(value==="Available")return"border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if(["Hold","Reserved"].includes(value))return"border-amber-500/30 bg-amber-500/10 text-amber-300";
  if(["Sold","Leased"].includes(value))return"border-sky-500/30 bg-sky-500/10 text-sky-300";
  return"border-slate-500/30 bg-slate-500/10 text-slate-300";
}

const PAGE_SIZE = 5;

export default function PropertiesWorkspace({canWrite}:{canWrite:boolean}){
  const {lang}=useApp(); const ar=lang!=="EN"; const locale=ar?"ar-SA":"en-SA"; const t=(a:string,e:string)=>ar?a:e;
  const [rows,setRows]=useState<UnitRow[]>([]); const [projects,setProjects]=useState<ProjectOption[]>([]); const [stats,setStats]=useState(EMPTY_STATS);
  const [selectedId,setSelectedId]=useState(""); const [search,setSearch]=useState(""); const [status,setStatus]=useState(""); const [projectId,setProjectId]=useState(""); const [readiness,setReadiness]=useState(""); const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [createOpen,setCreateOpen]=useState(false); const [editOpen,setEditOpen]=useState(false);
  const [form,setForm]=useState({projectId:"",unitNumber:"",priceSar:"",type:"",area:"",beds:"",city:"",district:"",floorPosition:"0",agentName:"",description:"",tourType:"",tourUrl:"",status:"Available",lat:"",lng:""});

  const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await fetch("/api/properties",{credentials:"include",cache:"no-store"});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.error||"load failed");setRows(Array.isArray(payload.data)?payload.data:[]);setProjects(Array.isArray(payload.projects)?payload.projects:[]);setStats(payload.stats||EMPTY_STATS);setSelectedId((current)=>payload.data?.some((row:UnitRow)=>row.id===current)?current:payload.data?.[0]?.id||"");}catch{setRows([]);setError(t("تعذر تحميل العقارات والوحدات.","Unable to load properties."));}finally{setLoading(false)}},[ar]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("unitId");if(requested&&rows.some((row)=>row.id===requested))setSelectedId(requested)},[rows]);

  const selected=useMemo(()=>rows.find((row)=>row.id===selectedId)||null,[rows,selectedId]);
  const filtered=useMemo(()=>{const term=search.trim().toLowerCase();return rows.filter((row)=>{const text=[row.unitNumber,row.projectName,row.type,row.city,row.district,row.agentName].join(" ").toLowerCase();return(!status||row.status===status)&&(!projectId||row.projectId===projectId)&&(!readiness||(readiness==="ready"?row.readiness.ready:!row.readiness.ready))&&(!term||text.includes(term));});},[rows,search,status,projectId,readiness]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const paged=useMemo(()=>filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),[filtered,currentPage]);
  useEffect(()=>{setPage(1)},[search,status,projectId,readiness]);

  function resetForm(){setForm({projectId:"",unitNumber:"",priceSar:"",type:"",area:"",beds:"",city:"",district:"",floorPosition:"0",agentName:"",description:"",tourType:"",tourUrl:"",status:"Available",lat:"",lng:""});}
  function update(field:string,value:string){setForm((current)=>({...current,[field]:value}));}
  function openEdit(){if(!selected)return;setForm({projectId:selected.projectId,unitNumber:selected.unitNumber,priceSar:String(selected.price),type:selected.type,area:selected.area,beds:selected.beds==null?"":String(selected.beds),city:selected.city||"",district:selected.district||"",floorPosition:String(selected.floorPosition),agentName:selected.agentName||"",description:selected.description,tourType:selected.tourType||"",tourUrl:selected.tourUrl||"",status:selected.status,lat:selected.lat==null?"":String(selected.lat),lng:selected.lng==null?"":String(selected.lng)});setEditOpen(true);}

  async function createUnit(event:React.FormEvent){event.preventDefault();setBusy("create");setError("");try{const response=await fetch("/api/properties",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.error||"تعذر إنشاء الوحدة.");setCreateOpen(false);resetForm();setNotice(t("تم إنشاء الوحدة داخل المشروع المحدد.","Unit created in the selected project."));await load();}catch(cause){setError(cause instanceof Error?cause.message:"تعذر إنشاء الوحدة.");}finally{setBusy("");}}
  async function saveUnit(event:React.FormEvent){event.preventDefault();if(!selected)return;setBusy("edit");setError("");try{const response=await fetch(`/api/properties/${selected.id}`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,projectId:undefined,unitNumber:undefined})});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.error||"تعذر تحديث الوحدة.");setEditOpen(false);setNotice(t("تم تحديث بيانات التسويق والجاهزية.","Listing and readiness data updated."));await load();}catch(cause){setError(cause instanceof Error?cause.message:"تعذر تحديث الوحدة.");}finally{setBusy("");}}
  async function quickStatus(next:string){if(!selected)return;setBusy(`status:${next}`);setError("");try{const response=await fetch(`/api/properties/${selected.id}`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next,priceSar:selected.price})});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.error||"تعذر تحديث الحالة.");setNotice(t("تم تحديث حالة الوحدة.","Unit status updated."));await load();}catch(cause){setError(cause instanceof Error?cause.message:"تعذر تحديث الحالة.");}finally{setBusy("");}}

  const cards=[{label:t("إجمالي الوحدات","Total units"),value:stats.total,icon:Building2},{label:t("المتاح","Available"),value:stats.available,icon:BadgeCheck},{label:t("قيد الحجز","Held / reserved"),value:stats.held,icon:ShieldCheck},{label:t("جاهزة للتسويق","Marketing ready"),value:stats.marketingReady,icon:Sparkles}];

  return <section dir={ar?"rtl":"ltr"} className="nc-page nc-stack orca-container pb-10">
    <header className="orca-workspace-hero"><div><p className="text-xs font-bold text-[var(--nc-accent)]">{t("المشروع → الوحدة → العرض → الجولة → العقد","Project → unit → offer → tour → contract")}</p><h1 className="mt-1 text-2xl font-black">{t("مركز المخزون والجاهزية العقارية","Property Inventory & Listing Intelligence")}</h1><p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{t("مصدر موحد لحالة الوحدة وجودة العرض وروابط التشغيل التجاري.","A single source for unit status, listing quality and commercial workflows.")}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} className="nc-btn nc-btn-ghost"><RefreshCw size={15}/>{t("تحديث","Refresh")}</button>{canWrite&&<button type="button" onClick={()=>{resetForm();setCreateOpen(true)}} className="nc-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black"><Plus size={16}/>{t("إضافة وحدة","Add unit")}</button>}</div></header>

    <div className="orca-workspace-metrics">{cards.map(({label,value,icon:Icon})=><div key={label} className="orca-workspace-metric"><div className="flex justify-between text-xs font-bold text-[var(--nc-text-secondary)]"><span>{label}</span><Icon size={17}/></div><strong className="mt-3 block text-2xl">{value.toLocaleString(locale)}</strong></div>)}</div>
    <div className="orca-workspace-note"><span className="text-[var(--nc-text-secondary)]">{t("قيمة المخزون المتاح","Available inventory value")}: </span><strong>{money(stats.inventoryValue,locale)}</strong><span className="mx-3 text-[var(--nc-border)]">|</span><span className="text-[var(--nc-text-secondary)]">{t("جولات افتراضية","Virtual tours")}: </span><strong>{stats.virtualTours.toLocaleString(locale)}</strong></div>
    {(error||notice)&&<div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error?"border-rose-500/30 bg-rose-500/10 text-rose-200":"border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>{error||notice}</div>}

    <div className="space-y-4">
      <div className="orca-workspace-panel min-w-0 overflow-hidden">
        <div className="orca-workspace-toolbar grid gap-2 md:grid-cols-2 xl:grid-cols-4"><label className="relative"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)]"/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder={t("بحث بالوحدة أو المشروع أو الموقع","Search unit, project, or location")} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 pl-3 pr-10 text-sm outline-none"/></label><SettingsSelect value={projectId} onChange={setProjectId} options={[{value:"",label:t("كل المشاريع","All projects")},...projects.map((item)=>({value:item.id,label:item.name}))]}/><SettingsSelect value={status} onChange={setStatus} options={STATUS_OPTIONS.map((value)=>({value,label:value?statusLabel(value,ar):t("كل الحالات","All statuses")}))}/><SettingsSelect value={readiness} onChange={setReadiness} options={[{value:"",label:t("كل مستويات الجاهزية","All readiness")},{value:"ready",label:t("جاهزة للتسويق","Marketing ready")},{value:"needs-work",label:t("تحتاج استكمال","Needs work")}]} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="border-b border-[var(--nc-border)] text-xs text-[var(--nc-text-secondary)]"><tr><th className="px-4 py-3 text-start">{t("الوحدة","Unit")}</th><th className="px-4 py-3 text-start">{t("النوع والموقع","Type & location")}</th><th className="px-4 py-3 text-start">{t("السعر","Price")}</th><th className="px-4 py-3 text-start">{t("الجاهزية","Readiness")}</th><th className="px-4 py-3 text-start">{t("النشاط","Activity")}</th><th className="px-4 py-3 text-start">{t("الحالة","Status")}</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-12 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr>:filtered.length===0?<tr><td colSpan={6} className="p-12 text-center text-[var(--nc-text-secondary)]">{t("لا توجد وحدات مطابقة.","No matching units.")}</td></tr>:paged.map((row)=><tr key={row.id} onClick={()=>setSelectedId(row.id)} className={`orca-data-row cursor-pointer border-b border-[var(--nc-border)] ${selectedId===row.id?"is-selected":""}`}><td className="px-4 py-3"><strong>{row.unitNumber}</strong><span className="block text-xs text-[var(--nc-text-secondary)]">{row.projectName}</span></td><td className="px-4 py-3">{row.type}<span className="block text-xs text-[var(--nc-text-secondary)]">{[row.city,row.district].filter(Boolean).join(" · ")||"—"}</span></td><td className="px-4 py-3 font-bold">{money(row.price,locale)}</td><td className="px-4 py-3"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--nc-surface-strong)]"><div className="h-full bg-[var(--nc-accent)]" style={{width:`${row.readiness.score}%`}}/></div><span className="mt-1 block text-xs">{row.readiness.score}%</span></td><td className="px-4 py-3 text-xs"><span>{row.offerCount} {t("عرض","offers")}</span><span className="block">{row.tourCount} {t("جولة","tours")}</span></td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{statusLabel(row.status,ar)}</span></td></tr>)}</tbody></table></div>
        <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} locale={locale} ar={ar} onPage={setPage}/>
      </div>

      <aside className="orca-workspace-panel p-5">{selected?<div className="orca-workspace-detail"><div className="orca-detail-header flex items-start justify-between gap-3"><div><p className="text-xs text-[var(--nc-text-secondary)]">{selected.projectName}</p><h2 className="text-xl font-black">{selected.unitNumber}</h2><p className="text-sm text-[var(--nc-text-secondary)]">{selected.type} · {selected.area}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(selected.status)}`}>{statusLabel(selected.status,ar)}</span></div>
        <div className="orca-detail-primary rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-4"><div className="mb-3 flex items-center justify-between"><strong>{t("جاهزية العرض","Listing readiness")}</strong><strong className={selected.readiness.ready?"text-emerald-300":"text-amber-300"}>{selected.readiness.score}%</strong></div><div className="grid grid-cols-2 gap-2 text-xs">{Object.entries(selected.readiness.checks).map(([key,ok])=><div key={key} className={`rounded-lg border px-2 py-1.5 ${ok?"border-emerald-500/20 bg-emerald-500/10 text-emerald-300":"border-[var(--nc-border)] text-[var(--nc-text-secondary)]"}`}>{ok?"✓":"○"} {readinessLabel(key,ar)}</div>)}</div></div>
        <div className="orca-detail-secondary grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3"><Metric icon={ImageIcon} value={selected.mediaCount} label={t("صور","Media")}/><Metric icon={FileText} value={selected.documentCount} label={t("مستندات","Docs")}/><Metric icon={MapPinned} value={selected.tourCount} label={t("جولات","Tours")}/></div>
        <div className="orca-detail-primary rounded-2xl border border-[var(--nc-border)] p-4 text-sm"><Info label={t("السعر","Price")} value={money(selected.price,locale)}/><Info label={t("الموقع","Location")} value={[selected.city,selected.district].filter(Boolean).join(" · ")||"—"}/><Info label={t("الوكيل","Agent")} value={selected.agentName||"—"}/><Info label={t("الفرص","Opportunities")} value={String(selected.opportunityCount)}/><Info label={t("العروض","Offers")} value={String(selected.offerCount)}/></div>
        {selected.description&&<p className="orca-detail-secondary rounded-xl border border-[var(--nc-border)] p-3 text-sm leading-6 text-[var(--nc-text-secondary)]">{selected.description}</p>}
        {selected.tourUrl&&<button type="button" onClick={()=>window.open(selected.tourUrl!,"_blank","noopener,noreferrer")} className="orca-detail-full nc-btn nc-btn-ghost w-full justify-center"><ExternalLink size={15}/>{t("فتح الجولة الافتراضية","Open virtual tour")}</button>}
        <div className="orca-detail-full grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={()=>window.location.assign(`/operations/offers?unitId=${selected.id}`)} className="nc-btn nc-btn-ghost justify-center">{t("العروض","Offers")}</button><button type="button" onClick={()=>window.location.assign(`/operations/tours?unitId=${selected.id}`)} className="nc-btn nc-btn-ghost justify-center">{t("الجولات","Tours")}</button>{selected.contractId&&<button type="button" onClick={()=>window.location.assign(`/operations/rental/sales/contracts/${selected.contractId}`)} className="nc-btn-primary rounded-xl py-2.5 font-black sm:col-span-2 xl:col-span-1 2xl:col-span-2">{t("فتح العقد","Open contract")}</button>}</div>
        {canWrite&&<div className="orca-detail-full grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={openEdit} className="nc-btn nc-btn-ghost justify-center">{t("تحرير البيانات","Edit listing")}</button>{selected.status==="Available"?<button type="button" onClick={()=>void quickStatus("Hold")} disabled={busy!==""} className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300">{t("وضع قيد الحجز","Place on hold")}</button>:["Hold","Reserved","Maintenance"].includes(selected.status)&&!selected.contractId?<button type="button" onClick={()=>void quickStatus("Available")} disabled={busy!==""} className="rounded-xl border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300">{t("إعادة للإتاحة","Make available")}</button>:null}</div>}
      </div>:<p className="py-16 text-center text-sm text-[var(--nc-text-secondary)]">{t("اختر وحدة لعرض تفاصيلها.","Select a unit.")}</p>}</aside>
    </div>

    {createOpen&&<UnitModal title={t("إضافة وحدة حقيقية","Add real unit")} form={form} update={update} projects={projects} ar={ar} busy={busy==="create"} onClose={()=>setCreateOpen(false)} onSubmit={createUnit} create />}
    {editOpen&&selected&&<UnitModal title={t("تحرير بيانات الوحدة والجاهزية","Edit unit and listing readiness")} form={form} update={update} projects={projects} ar={ar} busy={busy==="edit"} onClose={()=>setEditOpen(false)} onSubmit={saveUnit} />}
  </section>;
}

function readinessLabel(key:string,ar:boolean){const map:Record<string,[string,string]>={priced:["السعر","Price"],described:["الوصف","Description"],media:["الصور","Media"],documents:["المستندات","Documents"],location:["الموقع","Location"],coordinates:["الإحداثيات","Coordinates"],virtualTour:["جولة افتراضية","Virtual tour"]};const item=map[key]||[key,key];return ar?item[0]:item[1]}
function Pagination({
  page,
  totalPages,
  total,
  locale,
  ar,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  locale: string;
  ar: boolean;
  onPage: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--nc-border)] px-4 py-3 text-xs text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <span>
        {ar
          ? `عرض ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} من ${total.toLocaleString(locale)}`
          : `Showing ${start.toLocaleString(locale)}–${end.toLocaleString(locale)} of ${total.toLocaleString(locale)}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ar ? "السابق" : "Previous"}
        </button>
        <span className="min-w-16 text-center font-bold text-[var(--nc-text-primary)]">
          {page.toLocaleString(locale)} / {totalPages.toLocaleString(locale)}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-[var(--nc-border)] px-3 py-1.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ar ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Info({label,value}:{label:string;value:string}){return <div className="orca-info-cell"><span>{label}</span><strong>{value}</strong></div>}
function Metric({icon:Icon,value,label}:{icon:typeof ImageIcon;value:number;label:string}){return <div className="orca-mini-metric"><Icon size={16}/><strong>{value}</strong><span>{label}</span></div>}

function UnitModal({title,form,update,projects,ar,busy,onClose,onSubmit,create=false}:{title:string;form:Record<string,string>;update:(field:string,value:string)=>void;projects:ProjectOption[];ar:boolean;busy:boolean;onClose:()=>void;onSubmit:(event:React.FormEvent)=>void;create?:boolean}){
 const t=(a:string,e:string)=>ar?a:e;
 return <div className="orca-dialog-overlay"><div role="dialog" aria-modal="true" className="orca-dialog max-w-3xl"><div className="orca-dialog-header"><h2 className="font-black">{title}</h2><button type="button" onClick={onClose} className="orca-dialog-close"><X size={18}/></button></div><form onSubmit={onSubmit} className="orca-dialog-body grid gap-4 sm:grid-cols-2">
 {create&&<Field label={t("المشروع","Project")}><SettingsSelect value={form.projectId} onChange={(value)=>update("projectId",value)} options={projects.map((item)=>({value:item.id,label:`${item.name} · ${item.city}`}))} placeholder={t("اختر المشروع الحقيقي","Choose real project")}/></Field>}
 {create&&<Field label={t("رقم الوحدة","Unit number")}><input value={form.unitNumber} onChange={(e)=>update("unitNumber",e.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>}
 <Field label={t("السعر","Price")}><input type="number" min="1" value={form.priceSar} onChange={(e)=>update("priceSar",e.target.value)} required className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <Field label={t("الحالة","Status")}><SettingsSelect value={form.status} onChange={(value)=>update("status",value)} options={["Available","Hold","Reserved","Maintenance",...(form.status==="Sold"?["Sold"]:[]),...(form.status==="Leased"?["Leased"]:[])].map((value)=>({value,label:statusLabel(value,ar)}))}/></Field>
 <Field label={t("النوع","Type")}><input value={form.type} onChange={(e)=>update("type",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field><Field label={t("المساحة","Area")}><input value={form.area} onChange={(e)=>update("area",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <Field label={t("غرف النوم","Bedrooms")}><input type="number" min="0" value={form.beds} onChange={(e)=>update("beds",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field><Field label={t("الطابق","Floor")}><input type="number" value={form.floorPosition} onChange={(e)=>update("floorPosition",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <Field label={t("المدينة","City")}><input value={form.city} onChange={(e)=>update("city",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field><Field label={t("الحي","District")}><input value={form.district} onChange={(e)=>update("district",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <Field label={t("خط العرض","Latitude")}><input type="number" step="any" value={form.lat} onChange={(e)=>update("lat",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field><Field label={t("خط الطول","Longitude")}><input type="number" step="any" value={form.lng} onChange={(e)=>update("lng",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <Field label={t("الوكيل","Agent")}><input value={form.agentName} onChange={(e)=>update("agentName",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field><Field label={t("نوع الجولة الافتراضية","Virtual tour type")}><input value={form.tourType} onChange={(e)=>update("tourType",e.target.value)} placeholder="Matterport / 360 / Video" className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field>
 <div className="sm:col-span-2"><Field label={t("رابط الجولة الافتراضية","Virtual tour URL")}><input type="url" value={form.tourUrl} onChange={(e)=>update("tourUrl",e.target.value)} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field></div>
 <div className="sm:col-span-2"><Field label={t("الوصف التسويقي","Marketing description")}><textarea rows={4} value={form.description} onChange={(e)=>update("description",e.target.value)} className="orca-form-textarea w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none"/></Field></div>
 <button type="submit" disabled={busy||create&&(!form.projectId||!form.unitNumber)} className="nc-btn-primary sm:col-span-2 rounded-xl py-2.5 font-black">{busy?t("جارٍ الحفظ...","Saving..."):t("حفظ الوحدة","Save unit")}</button>
 </form></div></div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-1.5"><span className="text-xs font-bold text-[var(--nc-text-secondary)]">{label}</span>{children}</label>}
