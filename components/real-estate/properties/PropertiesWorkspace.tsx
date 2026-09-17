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
} from "lucide-react";
import SettingsSelect from "@/components/settings/SettingsSelect";
import RentFlexPropertyAvailabilityPanel from "@/components/rent-flex/RentFlexPropertyAvailabilityPanel";
import {
  OperationsDialog,
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsNumberField,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
  OperationsTextareaField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
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

  return (
    <main dir={ar ? "rtl" : "ltr"} className={operationsVisual.page} data-properties-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={t("المشروع → الوحدة → العرض → الجولة → العقد", "Project → unit → offer → tour → contract")}
          title={t("المخزون والجاهزية العقارية", "Property Inventory & Listing Intelligence")}
          description={t("مصدر موحد لحالة الوحدة وجودة العرض وروابط التشغيل التجاري.", "A single source for unit status, listing quality and commercial workflows.")}
          icon={Building2}
          actions={
            <>
              <button type="button" onClick={() => void load()} className={operationsVisual.iconButton} aria-label={t("تحديث الوحدات", "Refresh units")} title={t("تحديث", "Refresh")}>
                <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </button>
              {canWrite ? (
                <button type="button" onClick={() => { resetForm(); setCreateOpen(true); }} className={operationsVisual.primaryButton}>
                  <Plus aria-hidden="true" />{t("إضافة وحدة", "Add unit")}
                </button>
              ) : null}
            </>
          }
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title={t("إجمالي الوحدات", "Total units")} value={stats.total.toLocaleString(locale)} description={t("المخزون المسجل", "Recorded inventory")} icon={Building2} />
          <OperationsMetricCard title={t("المتاح", "Available")} value={stats.available.toLocaleString(locale)} description={money(stats.inventoryValue, locale)} icon={BadgeCheck} />
          <OperationsMetricCard title={t("قيد الحجز", "Held / reserved")} value={stats.held.toLocaleString(locale)} description={t("وحدات غير متاحة مؤقتًا", "Temporarily unavailable")} icon={ShieldCheck} />
          <OperationsMetricCard title={t("جاهزة للتسويق", "Marketing ready")} value={stats.marketingReady.toLocaleString(locale)} description={`${stats.virtualTours.toLocaleString(locale)} ${t("جولة افتراضية", "virtual tours")}`} icon={Sparkles} />
        </OperationsKpiGrid>

        <RentFlexPropertyAvailabilityPanel canWrite={canWrite} />

        {error || notice ? (
          <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${error ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
            {error || notice}
          </div>
        ) : null}

        <OperationsExecutiveGrid>
          <OperationsPanel className="overflow-hidden" dir={ar ? "rtl" : "ltr"}>
            <OperationsPanelHeader title={t("الوحدات", "Units")} description={t("البحث والتصفية واختيار الوحدة", "Search, filter and select a unit")} icon={Building2} meta={<span className={operationsVisual.counterBadge}>{filtered.length}</span>} />
            <div className="grid gap-2 border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative min-w-0">
                <Search size={15} className="absolute inset-y-0 right-3 my-auto text-[var(--nc-text-dim)]" aria-hidden="true" />
                <OperationsTextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("بحث بالوحدة أو المشروع أو الموقع", "Search unit, project, or location")} className="pr-9" />
              </label>
              <SettingsSelect value={projectId} onChange={setProjectId} options={[{value:"",label:t("كل المشاريع","All projects")},...projects.map((item)=>({value:item.id,label:item.name}))]} />
              <SettingsSelect value={status} onChange={setStatus} options={STATUS_OPTIONS.map((value)=>({value,label:value?statusLabel(value,ar):t("كل الحالات","All statuses")}))} />
              <SettingsSelect value={readiness} onChange={setReadiness} options={[{value:"",label:t("كل مستويات الجاهزية","All readiness")},{value:"ready",label:t("جاهزة للتسويق","Marketing ready")},{value:"needs-work",label:t("تحتاج استكمال","Needs work")}]}/>
            </div>

            <div className="orca-operations-flow-region">
              {loading ? (
                <div className="p-3"><OperationsEmptyState><Loader2 className="animate-spin" aria-label={t("جارٍ التحميل", "Loading")} /></OperationsEmptyState></div>
              ) : paged.length === 0 ? (
                <div className="p-3"><OperationsEmptyState>{t("لا توجد وحدات مطابقة.", "No matching units.")}</OperationsEmptyState></div>
              ) : (
                <>
                  <div className="grid grid-cols-[minmax(120px,1.2fr)_minmax(110px,.9fr)_100px_90px_auto] items-center gap-3 border-b border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2 text-[12px] font-bold text-[var(--nc-text-secondary)]">
                    <span>{t("الوحدة", "Unit")}</span>
                    <span>{t("النوع والموقع", "Type & location")}</span>
                    <span>{t("السعر", "Price")}</span>
                    <span>{t("الجاهزية", "Readiness")}</span>
                    <span>{t("الحالة", "Status")}</span>
                  </div>
                  <OperationsMasterList>
                    {paged.map((row) => (
                      <OperationsMasterRow key={row.id} selected={selectedId === row.id} onClick={() => setSelectedId(row.id)} className="grid min-h-[72px] grid-cols-[minmax(120px,1.2fr)_minmax(110px,.9fr)_100px_90px_auto] items-center gap-3 px-3 py-2.5">
                        <span className="min-w-0"><strong className="block truncate text-[14px] font-bold text-[var(--nc-text-primary)]">{row.unitNumber}</strong><span className="mt-1 block truncate text-[11px] text-[var(--nc-text-secondary)]">{row.projectName}</span></span>
                        <span className="min-w-0"><strong className="block truncate text-[14px] text-[var(--nc-text-primary)]">{row.type}</strong><span className="mt-1 block truncate text-[11px] text-[var(--nc-text-secondary)]">{[row.city,row.district].filter(Boolean).join(" · ")||"—"}</span></span>
                        <strong className="text-[14px] text-[var(--nc-text-primary)]">{money(row.price,locale)}</strong>
                        <span className="min-w-0"><span className={operationsVisual.progressTrack}><span className={operationsVisual.progressBar} style={{width:`${row.readiness.score}%`}} /></span><span className="mt-1 block text-[11px] text-[var(--nc-text-secondary)]">{row.readiness.score}%</span></span>
                        <span className={`rounded-full border px-2.5 py-1 text-[12px] font-bold ${statusClass(row.status)}`}>{statusLabel(row.status,ar)}</span>
                      </OperationsMasterRow>
                    ))}
                  </OperationsMasterList>
                </>
              )}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} locale={locale} ar={ar} onPage={setPage}/>
          </OperationsPanel>

          <OperationsPanel className="self-start overflow-hidden" dir={ar ? "rtl" : "ltr"}>
            <OperationsPanelHeader
              title={selected ? selected.unitNumber : t("تفاصيل الوحدة", "Unit details")}
              description={selected ? `${selected.projectName} · ${selected.type}` : t("اختر وحدة من القائمة", "Select a unit from the list")}
              icon={Building2}
              meta={selected ? <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(selected.status)}`}>{statusLabel(selected.status,ar)}</span> : null}
            />
            <div className="orca-operations-flow-region p-3">
              {selected ? (
                <div className="grid gap-3">
                  <div className={`${operationsVisual.softPanel} p-3`}>
                    <div className="mb-2 flex items-center justify-between gap-3"><strong className="text-xs">{t("جاهزية العرض", "Listing readiness")}</strong><strong className={selected.readiness.ready ? "text-emerald-300" : "text-amber-300"}>{selected.readiness.score}%</strong></div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">{Object.entries(selected.readiness.checks).map(([key,ok])=><div key={key} className={`rounded-lg border px-2 py-1.5 ${ok?"border-emerald-500/20 bg-emerald-500/10 text-emerald-300":"border-[var(--nc-border)] text-[var(--nc-text-secondary)]"}`}>{ok?"✓":"○"} {readinessLabel(key,ar)}</div>)}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2"><Metric icon={ImageIcon} value={selected.mediaCount} label={t("صور","Media")}/><Metric icon={FileText} value={selected.documentCount} label={t("مستندات","Docs")}/><Metric icon={MapPinned} value={selected.tourCount} label={t("جولات","Tours")}/></div>
                  <div className={`${operationsVisual.contentCard} p-3`}><Info label={t("السعر","Price")} value={money(selected.price,locale)}/><Info label={t("الموقع","Location")} value={[selected.city,selected.district].filter(Boolean).join(" · ")||"—"}/><Info label={t("الوكيل","Agent")} value={selected.agentName||"—"}/><Info label={t("الفرص","Opportunities")} value={String(selected.opportunityCount)}/><Info label={t("العروض","Offers")} value={String(selected.offerCount)}/></div>
                  {selected.description ? <p className={`${operationsVisual.contentCard} p-3 text-[11px] leading-5 text-[var(--nc-text-secondary)]`}>{selected.description}</p> : null}
                  {selected.tourUrl ? <button type="button" onClick={()=>window.open(selected.tourUrl!,"_blank","noopener,noreferrer")} className={operationsVisual.secondaryButton}><ExternalLink aria-hidden="true"/>{t("فتح الجولة الافتراضية","Open virtual tour")}</button> : null}
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>window.location.assign(`/operations/offers?unitId=${selected.id}`)} className={operationsVisual.secondaryButton}>{t("العروض","Offers")}</button><button type="button" onClick={()=>window.location.assign(`/operations/tours?unitId=${selected.id}`)} className={operationsVisual.secondaryButton}>{t("الجولات","Tours")}</button>{selected.contractId ? <button type="button" onClick={()=>window.location.assign(`/operations/rental/sales/contracts/${selected.contractId}`)} className={`${operationsVisual.primaryButton} col-span-2`}>{t("فتح العقد","Open contract")}</button> : null}</div>
                  {canWrite ? <div className={`grid gap-2 border-t border-[var(--nc-border)] pt-3 ${selected.status==="Available"||(["Hold","Reserved","Maintenance"].includes(selected.status)&&!selected.contractId)?"grid-cols-2":"grid-cols-1"}`}><button type="button" onClick={openEdit} className={operationsVisual.secondaryButton}>{t("تحرير البيانات","Edit listing")}</button>{selected.status==="Available"?<button type="button" onClick={()=>void quickStatus("Hold")} disabled={busy!==""} className={operationsVisual.secondaryButton}>{t("وضع قيد الحجز","Place on hold")}</button>:["Hold","Reserved","Maintenance"].includes(selected.status)&&!selected.contractId?<button type="button" onClick={()=>void quickStatus("Available")} disabled={busy!==""} className={operationsVisual.primaryButton}>{t("إعادة للإتاحة","Make available")}</button>:null}</div> : null}
                </div>
              ) : (
                <OperationsEmptyState>{t("اختر وحدة لعرض تفاصيلها.", "Select a unit.")}</OperationsEmptyState>
              )}
            </div>
          </OperationsPanel>
        </OperationsExecutiveGrid>
      </div>

      <UnitModal open={createOpen} title={t("إضافة وحدة حقيقية","Add real unit")} form={form} update={update} projects={projects} ar={ar} busy={busy==="create"} onClose={()=>setCreateOpen(false)} onSubmit={createUnit} create />
      <UnitModal open={editOpen && Boolean(selected)} title={t("تحرير بيانات الوحدة والجاهزية","Edit unit and listing readiness")} form={form} update={update} projects={projects} ar={ar} busy={busy==="edit"} onClose={()=>setEditOpen(false)} onSubmit={saveUnit} />
    </main>
  );
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
          className={`${operationsVisual.secondaryButton} min-h-11 px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40`}
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
          className={`${operationsVisual.secondaryButton} min-h-11 px-3 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {ar ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Info({label,value}:{label:string;value:string}){return <div className="orca-info-cell"><span>{label}</span><strong>{value}</strong></div>}
function Metric({icon:Icon,value,label}:{icon:typeof ImageIcon;value:number;label:string}){return <div className="orca-mini-metric"><Icon size={16}/><strong>{value}</strong><span>{label}</span></div>}

function UnitModal({open,title,form,update,projects,ar,busy,onClose,onSubmit,create=false}:{open:boolean;title:string;form:Record<string,string>;update:(field:string,value:string)=>void;projects:ProjectOption[];ar:boolean;busy:boolean;onClose:()=>void;onSubmit:(event:React.FormEvent)=>void;create?:boolean}){
 const t=(a:string,e:string)=>ar?a:e;
 const field=(name:string)=>(value:string)=>update(name,value);
 return <OperationsDialog open={open} onClose={onClose} title={title} description={t("بيانات الوحدة والجاهزية التسويقية","Unit and listing readiness data")} closeLabel={t("إغلاق","Close")} closeDisabled={busy} className="max-w-3xl" dir={ar?"rtl":"ltr"} footer={<><button type="button" onClick={onClose} disabled={busy} className={operationsVisual.secondaryButton}>{t("إلغاء","Cancel")}</button><button type="submit" form="property-unit-form" disabled={busy||Boolean(create&&(!form.projectId||!form.unitNumber))} className={operationsVisual.primaryButton}>{busy?t("جارٍ الحفظ…","Saving…"):t("حفظ الوحدة","Save unit")}</button></>}>
   <form id="property-unit-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
     {create?<OperationsFormField label={t("المشروع","Project")}><SettingsSelect value={form.projectId} onChange={field("projectId")} options={projects.map((item)=>({value:item.id,label:`${item.name} · ${item.city}`}))} placeholder={t("اختر المشروع الحقيقي","Choose real project")}/></OperationsFormField>:null}
     {create?<OperationsFormField label={t("رقم الوحدة","Unit number")}><OperationsTextField value={form.unitNumber} onChange={(e)=>update("unitNumber",e.target.value)} /></OperationsFormField>:null}
     <OperationsFormField label={t("السعر","Price")}><OperationsNumberField mode="decimal" value={form.priceSar} onValueChange={field("priceSar")} className="orca-operations-input" /></OperationsFormField>
     <OperationsFormField label={t("الحالة","Status")}><SettingsSelect value={form.status} onChange={field("status")} options={["Available","Hold","Reserved","Maintenance",...(form.status==="Sold"?["Sold"]:[]),...(form.status==="Leased"?["Leased"]:[])].map((value)=>({value,label:statusLabel(value,ar)}))}/></OperationsFormField>
     <OperationsFormField label={t("النوع","Type")}><OperationsTextField value={form.type} onChange={(e)=>update("type",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("المساحة","Area")}><OperationsTextField value={form.area} onChange={(e)=>update("area",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("غرف النوم","Bedrooms")}><OperationsNumberField value={form.beds} onValueChange={field("beds")} className="orca-operations-input" /></OperationsFormField>
     <OperationsFormField label={t("الطابق","Floor")}><OperationsNumberField value={form.floorPosition} onValueChange={field("floorPosition")} className="orca-operations-input" /></OperationsFormField>
     <OperationsFormField label={t("المدينة","City")}><OperationsTextField value={form.city} onChange={(e)=>update("city",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("الحي","District")}><OperationsTextField value={form.district} onChange={(e)=>update("district",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("خط العرض","Latitude")}><OperationsNumberField mode="decimal" value={form.lat} onValueChange={field("lat")} className="orca-operations-input" /></OperationsFormField>
     <OperationsFormField label={t("خط الطول","Longitude")}><OperationsNumberField mode="decimal" value={form.lng} onValueChange={field("lng")} className="orca-operations-input" /></OperationsFormField>
     <OperationsFormField label={t("الوكيل","Agent")}><OperationsTextField value={form.agentName} onChange={(e)=>update("agentName",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("نوع الجولة الافتراضية","Virtual tour type")}><OperationsTextField value={form.tourType} onChange={(e)=>update("tourType",e.target.value)} placeholder="Matterport / 360 / Video" /></OperationsFormField>
     <OperationsFormField label={t("رابط الجولة الافتراضية","Virtual tour URL")} className="sm:col-span-2"><OperationsTextField type="url" value={form.tourUrl} onChange={(e)=>update("tourUrl",e.target.value)} /></OperationsFormField>
     <OperationsFormField label={t("الوصف التسويقي","Marketing description")} className="sm:col-span-2"><OperationsTextareaField rows={4} value={form.description} onChange={(e)=>update("description",e.target.value)} /></OperationsFormField>
   </form>
 </OperationsDialog>
}
