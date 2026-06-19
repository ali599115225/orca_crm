"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock, Eye, Headphones, PlusCircle, ShieldCheck, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { closeTicketAction, createTicketAction } from "@/app/actions/helpdesk";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
import { toArabicNumerals } from "@/lib/formatters";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface Reply {
  id: string;
  message: string;
  sender: "CLIENT" | "SUPPORT" | "AI";
  createdAt: string;
}

interface HelpdeskViewProps {
  initialTickets: Ticket[];
  tenantName: string;
}

const PAGE_SIZE = 5;

const TEXT = {
  AR: {
    title: "مركز الدعم",
    description: "مركز الدعم لإدارة التذاكر والردود ضمن نموذج العمليات الموحد.",
    openTickets: "التذاكر المفتوحة",
    highPriority: "عالية الأولوية",
    waitingCustomer: "بانتظار العميل",
    slaMet: "SLA المحقق",
    listTitle: "مركز الدعم",
    latestFirst: "الأحدث تحديثًا",
    newLabel: "تذكرة جديدة",
    search: "ابحث...",
    filter: "تصفية التذاكر",
    all: "الكل",
    open: "مفتوحة",
    pending: "قيد الانتظار",
    closed: "مغلقة",
    sla: "SLA",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    openDetails: "فتح",
    assign: "إسناد",
    close: "إغلاق",
    closeConfirm: "هل تريد إغلاق هذه التذكرة؟",
    closedOk: "تم إغلاق التذكرة",
    closeError: "تعذر إغلاق التذكرة",
    subject: "موضوع التذكرة",
    details: "تفاصيل التذكرة",
    sendTicket: "إرسال التذكرة",
    replyPlaceholder: "اكتب رد متابعة...",
    sendReply: "إرسال",
    noData: "لا توجد بيانات",
    noTickets: "لا توجد تذاكر دعم.",
    select: "اختر تذكرة لمشاهدة التفاصيل",
    newTicketOk: "تم إنشاء التذكرة",
    newTicketError: "تعذر إنشاء التذكرة",
    supportTeam: "فريق الدعم",
    medium: "متوسطة",
    high: "مرتفعة",
    ticket: "تذكرة",
  },
  EN: {
    title: "Support Center",
    description: "Support Center for tickets and replies within the unified operations workspace.",
    openTickets: "Open tickets",
    highPriority: "High priority",
    waitingCustomer: "Waiting on customer",
    slaMet: "SLA met",
    listTitle: "Support Center",
    latestFirst: "Recently updated",
    newLabel: "New ticket",
    search: "Search...",
    filter: "Filter tickets",
    all: "All",
    open: "Open",
    pending: "Pending",
    closed: "Closed",
    sla: "SLA",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    openDetails: "Open",
    assign: "Assign",
    close: "Close",
    closeConfirm: "Close this ticket?",
    closedOk: "Ticket closed",
    closeError: "Failed to close ticket",
    subject: "Ticket subject",
    details: "Ticket details",
    sendTicket: "Send ticket",
    replyPlaceholder: "Type a follow-up reply...",
    sendReply: "Send",
    noData: "No data",
    noTickets: "No support tickets.",
    select: "Select a ticket to view details",
    newTicketOk: "Ticket created",
    newTicketError: "Failed to create ticket",
    supportTeam: "Support team",
    medium: "Medium",
    high: "High",
    ticket: "Ticket",
  },
};

export default function HelpdeskView({ initialTickets, tenantName }: HelpdeskViewProps) {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [newMode, setNewMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatDateTime = (value?: Date | string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const ticketNumber = (ticket: Ticket) => {
    const ordered = tickets
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .findIndex((item) => item.id === ticket.id);
    const number = String(Math.max(1, ordered + 1)).padStart(3, "0");
    return `${t.ticket} #${number}`;
  };

  const priorityFor = (ticket: Ticket) => {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    return text.includes("عطل") || text.includes("خطأ") || text.includes("مشكلة") || text.includes("error") ? t.high : t.medium;
  };

  const slaMet = (ticket: Ticket) => {
    const created = new Date(ticket.createdAt).getTime();
    const updated = new Date(ticket.updatedAt || ticket.createdAt).getTime();
    return updated - created <= 15 * 60 * 1000;
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [tickets]);

  const selectedTicket = sortedTickets.find((ticket) => ticket.id === selectedId) || null;

  useEffect(() => {
    if (!selectedTicket) {
      setReplies([]);
      return;
    }
    const ticketId = selectedTicket.id;
    async function loadReplies() {
      try {
        const response = await fetch(`/api/v1/support/tickets/${ticketId}/reply`);
        const json = await response.json();
        if (json.success) setReplies(json.data);
      } catch {
        setReplies([]);
      }
    }
    loadReplies();
  }, [selectedTicket?.id]);

  const filteredTickets = sortedTickets.filter((ticket) => {
    const haystack = `${ticket.title} ${ticket.description} ${ticketNumber(ticket)}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || ticket.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCount = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const highCount = tickets.filter((ticket) => priorityFor(ticket) === t.high).length;
  const waitingCount = tickets.filter((ticket) => ticket.status === "OPEN" && !ticket.aiResponse).length;
  const slaCount = tickets.filter(slaMet).length;
  const slaRate = tickets.length ? Math.round((slaCount / tickets.length) * 100) : 0;

  async function createTicket() {
    if (!newTitle.trim() || !newDescription.trim()) return;
    const formData = new FormData();
    formData.append("title", newTitle.trim());
    formData.append("description", newDescription.trim());
    const result = await createTicketAction(formData);
    if (result.success && "ticket" in result && result.ticket) {
      const newTicket: Ticket = {
        id: result.ticket.id,
        title: result.ticket.title,
        description: result.ticket.description,
        status: result.ticket.status,
        aiResponse: result.ticket.aiResponse,
        createdAt: result.ticket.createdAt,
        updatedAt: result.ticket.updatedAt || result.ticket.createdAt,
      };
      setTickets((current) => [newTicket, ...current]);
      setSelectedId(newTicket.id);
      setNewMode(false);
      setNewTitle("");
      setNewDescription("");
      toast.success(t.newTicketOk);
    } else {
      toast.error(t.newTicketError);
    }
  }

  async function closeTicket(ticket: Ticket) {
    if (!window.confirm(t.closeConfirm)) return;
    const result = await closeTicketAction(ticket.id);
    if (result.success) {
      setTickets((current) => current.map((item) => (item.id === ticket.id ? { ...item, status: "CLOSED", updatedAt: new Date() } : item)));
      toast.success(t.closedOk);
    } else {
      toast.error(t.closeError);
    }
  }

  async function sendReply() {
    if (!replyInput.trim() || !selectedTicket) return;
    setSubmittingReply(true);
    try {
      const response = await fetch(`/api/v1/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyInput.trim(), sender: "CLIENT" }),
      });
      const json = await response.json();
      if (json.success) {
        setReplies((current) => [...current, json.data]);
        setReplyInput("");
      }
    } finally {
      setSubmittingReply(false);
    }
  }

  const listItems: WorkspaceListItem[] = pageItems.map((ticket) => ({
    id: ticket.id,
    title: ticketNumber(ticket),
    snippet: ticket.title || t.noData,
    timestamp: formatDateTime(ticket.updatedAt || ticket.createdAt),
    avatar: "#",
    selected: ticket.id === selectedId && !newMode,
    badge: { label: slaMet(ticket) ? t.sla : t.pending, tone: slaMet(ticket) ? "success" : "warning" },
    onSelect: () => {
      setNewMode(false);
      setSelectedId(ticket.id);
    },
    actions: [
      { label: t.openDetails, icon: Eye, onClick: () => setSelectedId(ticket.id) },
      { label: t.assign, icon: UserPlus, onClick: () => toast(t.assign) },
      { label: t.close, icon: Archive, onClick: () => closeTicket(ticket), disabled: ticket.status === "CLOSED" },
    ],
  }));

  const timeline: WorkspaceTimelineItem[] = selectedTicket
    ? [
        { id: "description", body: selectedTicket.description || t.noData, time: formatDateTime(selectedTicket.createdAt), side: "neutral" },
        ...(selectedTicket.aiResponse
          ? [{ id: "ai", body: selectedTicket.aiResponse, time: formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt), side: "in" as const }]
          : []),
        ...replies.map((reply) => ({
          id: reply.id,
          body: reply.message,
          time: formatDateTime(reply.createdAt),
          side: reply.sender === "CLIENT" ? ("out" as const) : ("in" as const),
        })),
      ]
    : [];

  const detail = newMode
    ? {
        avatar: "+",
        title: t.newLabel,
        meta: tenantName,
        actions: [
          { label: t.openDetails, icon: Eye, onClick: () => setNewMode(false) },
          { label: t.assign, icon: UserPlus, onClick: () => toast(t.assign) },
          { label: t.close, icon: Archive, tone: "danger" as const, onClick: createTicket },
        ],
        context: [
          { label: t.customer, value: tenantName },
          { label: t.owner, value: t.supportTeam },
          { label: t.priority, value: t.medium },
        ] as [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }],
        timeline: [] as WorkspaceTimelineItem[],
        emptyTitle: t.newLabel,
        emptyDescription: t.details,
        composer: {
          mode: "message" as const,
          value: newDescription,
          placeholder: t.details,
          sendLabel: t.sendTicket,
          onChange: setNewDescription,
          onSend: createTicket,
          disabled: !newTitle.trim() || !newDescription.trim(),
          fields: [{ id: "title", label: t.subject, value: newTitle, placeholder: t.subject, onChange: setNewTitle, required: true }],
        },
      }
    : selectedTicket
      ? {
          avatar: "#",
          title: ticketNumber(selectedTicket),
          meta: `${selectedTicket.status === "OPEN" ? t.open : t.closed} · ${formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt)}`,
          actions: [
            { label: t.openDetails, icon: Eye, onClick: () => undefined },
            { label: t.assign, icon: UserPlus, onClick: () => toast(t.assign) },
            { label: t.close, icon: Archive, tone: "danger" as const, onClick: () => closeTicket(selectedTicket), disabled: selectedTicket.status === "CLOSED" },
          ],
          context: [
            { label: t.customer, value: tenantName },
            { label: t.owner, value: t.supportTeam },
            { label: t.priority, value: priorityFor(selectedTicket) },
          ] as [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }],
          timeline,
          emptyTitle: t.noData,
          emptyDescription: t.noTickets,
          composer:
            selectedTicket.status === "OPEN"
              ? {
                  mode: "message" as const,
                  value: replyInput,
                  placeholder: t.replyPlaceholder,
                  sendLabel: t.sendReply,
                  onChange: setReplyInput,
                  onSend: sendReply,
                  disabled: submittingReply || !replyInput.trim(),
                }
              : undefined,
        }
      : null;

  return (
    <UnifiedOperationsWorkspace
      module="helpdesk"
      language={language}
      title={t.title}
      description={t.description}
      kpis={[
        { label: t.openTickets, value: formatNumber(openCount), icon: Headphones },
        { label: t.highPriority, value: formatNumber(highCount), icon: ShieldCheck },
        { label: t.waitingCustomer, value: formatNumber(waitingCount), icon: Clock },
        { label: t.slaMet, value: `${formatNumber(slaRate)}${isArabic ? "٪" : "%"}`, icon: CheckCircle2 },
      ]}
      listTitle={t.listTitle}
      listSubtitle={`${t.latestFirst} · ${formatNumber(filteredTickets.length)} ${t.listTitle}`}
      newLabel={t.newLabel}
      onNew={() => {
        setNewMode(true);
        setSelectedId(null);
      }}
      searchValue={query}
      searchPlaceholder={t.search}
      onSearchChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      filterValue={filter}
      filterLabel={t.filter}
      filterOptions={[
        { value: "ALL", label: t.all },
        { value: "OPEN", label: t.open },
        { value: "CLOSED", label: t.closed },
      ]}
      onFilterChange={(value) => {
        setFilter(value);
        setPage(1);
      }}
      items={listItems}
      pagination={{
        page: safePage,
        totalPages,
        onPrevious: () => setPage((current) => Math.max(1, current - 1)),
        onNext: () => setPage((current) => Math.min(totalPages, current + 1)),
      }}
      detail={detail}
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
  );
}
