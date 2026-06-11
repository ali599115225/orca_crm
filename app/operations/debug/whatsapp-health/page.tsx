import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WhatsAppHealthPage() {
  let tenant;
  try {
    tenant = await getActiveTenant();
  } catch {
    redirect("/login");
  }

  const [messages, contacts, tasks] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        phone: true,
        direction: true,
        status: true,
        messageText: true,
        createdAt: true,
      },
    }),
    prisma.whatsAppContact.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        phone: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.task.findMany({
      where: {
        tenantId: tenant.id,
        description: { contains: "واتساب" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Health Check</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tenant: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{tenant.id}</code>
          </p>
        </div>
        <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
          {new Date().toLocaleString("en-US", { hour12: false })}
        </span>
      </div>

      {/* WhatsApp Messages */}
      <section className="border rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b">
          <h2 className="font-semibold text-blue-900">
            Last 10 WhatsApp Messages
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Direction</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Content</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    No messages found
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2">{m.phone}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          m.direction === "inbound"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {m.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          m.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : m.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : m.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.status || "received"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      {m.messageText?.slice(0, 50) || "(empty)"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {m.createdAt.toLocaleString("en-US", { hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* WhatsApp Contacts */}
      <section className="border rounded-lg overflow-hidden">
        <div className="bg-emerald-50 px-4 py-3 border-b">
          <h2 className="font-semibold text-emerald-900">
            Last 10 WhatsApp Contacts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      {c.id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2">{c.phone}</td>
                    <td className="px-3 py-2">{c.name || "(no name)"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {c.createdAt.toLocaleString("en-US", { hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* WhatsApp Tasks */}
      <section className="border rounded-lg overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b">
          <h2 className="font-semibold text-orange-900">
            Last 10 WhatsApp Tasks
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Due</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                    No WhatsApp tasks found
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      {t.id.slice(0, 8)}...
                    </td>
                    <td className="px-3 py-2">{t.title}</td>
                    <td className="px-3 py-2 max-w-xs truncate">
                      {t.description?.slice(0, 50) || "(empty)"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : t.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {t.dueDate.toLocaleString("en-US", { hour12: false })}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {t.createdAt.toLocaleString("en-US", { hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Summary */}
      <section className="border rounded-lg p-4 bg-gray-50">
        <h2 className="font-semibold mb-3">Summary</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{messages.length}</div>
            <div className="text-xs text-gray-500">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{contacts.length}</div>
            <div className="text-xs text-gray-500">Contacts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{tasks.length}</div>
            <div className="text-xs text-gray-500">Tasks</div>
          </div>
        </div>
      </section>
    </div>
  );
}
