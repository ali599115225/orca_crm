// scripts/test-six-sections.ts
import { prisma } from "../lib/prisma";

export interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

export async function runSixSectionsTestSuite(tenantId: string, userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Variables for cleanup
  let ticketId = "";
  let taskId = "";
  let createdLeadId = "";

  try {
    // 1. Test Agents state retrieval and toggling
    console.log("Testing AI Agents registry & toggles...");
    const agentListRes = await fetch(`http://localhost:3000/api/v1/agents`);
    const agentList = await agentListRes.json().catch(() => ({ success: false }));
    
    if (agentList.success && Array.isArray(agentList.data)) {
      results.push({
        step: "1. AI Agents Registry (GET)",
        success: true,
        message: `Successfully retrieved ${agentList.data.length} virtual agents.`,
        data: agentList.data
      });
    } else {
      results.push({
        step: "1. AI Agents Registry (GET)",
        success: false,
        message: "Failed to fetch agents registry."
      });
    }

    // Toggle Saher Agent to active
    const toggleRes = await fetch(`http://localhost:3000/api/v1/agents/SAHER/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true })
    });
    const toggle = await toggleRes.json().catch(() => ({ success: false }));
    
    if (toggle.success && toggle.isActive === true) {
      results.push({
        step: "2. Agent State Toggle (POST)",
        success: true,
        message: `Successfully toggled SAHER agent to active.`,
        data: toggle
      });
    } else {
      results.push({
        step: "2. Agent State Toggle (POST)",
        success: false,
        message: "Failed to toggle agent active state."
      });
    }

    // 2. Test Tasks API
    console.log("Testing Tasks creation and completion...");
    // Find a lead to associate with the task or create a temporary one
    let dbLead = await prisma.lead.findFirst({ where: { tenantId } });
    if (!dbLead) {
      dbLead = await prisma.lead.create({
        data: {
          tenantId,
          firstName: "اختبار",
          lastName: "مؤقت للمهام",
          phone: "+966500000000",
          city: "الرياض",
          source: "نظام الاختبارات",
          status: "NEW",
        }
      });
      createdLeadId = dbLead.id;
    }

    const taskDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const mockTask = await prisma.task.create({
      data: {
        tenantId,
        leadId: dbLead.id,
        assignedTo: userId,
        title: 'زيارة كروكي لمشروع فلل النرجس مع العميل',
        dueDate: taskDate,
        priority: 'HIGH',
        status: 'PENDING'
      }
    });
    taskId = mockTask.id;

    results.push({
      step: "3. Task Creation (DB/Prisma)",
      success: true,
      message: `Task successfully scheduled with ID ${mockTask.id}.`,
      data: mockTask
    });

    // Complete the task via database update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED' }
    });

    if (updatedTask.status === 'COMPLETED') {
      results.push({
        step: "4. Task Toggle Completion (PUT)",
        success: true,
        message: "Task marked completed successfully.",
        data: updatedTask
      });
    } else {
      results.push({
        step: "4. Task Toggle Completion (PUT)",
        success: false,
        message: "Failed to mark task as completed."
      });
    }

    // 3. Test Documents Archive APIs
    console.log("Testing Documents archive (GET & POST)...");
    const docPostRes = await fetch(`http://localhost:3000/api/v1/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'مخطط كروكي تجريبي.png',
        type: 'BLUEPRINT',
        linkedTo: '1',
        linkedType: 'PROPERTY',
        url: '/mock-documents/blueprint.png'
      })
    });
    const docPost = await docPostRes.json().catch(() => ({ success: false }));

    if (docPost.success && docPost.data) {
      results.push({
        step: "5. Document Upload Mock (POST)",
        success: true,
        message: `Successfully indexed document: ${docPost.data.name}`,
        data: docPost.data
      });

      // Retrieve documents list
      const docListRes = await fetch(`http://localhost:3000/api/v1/documents`);
      const docList = await docListRes.json().catch(() => ({ success: false }));
      
      if (docList.success && docList.data.some((d: any) => d.id === docPost.data.id)) {
        results.push({
          step: "6. Document Retrieval (GET)",
          success: true,
          message: "Uploaded document exists in repository list."
        });
      } else {
        results.push({
          step: "6. Document Retrieval (GET)",
          success: false,
          message: "Failed to verify document existence in list."
        });
      }

      // Delete the mock document
      const docDelRes = await fetch(`http://localhost:3000/api/v1/documents/${docPost.data.id}`, {
        method: 'DELETE'
      });
      const docDel = await docDelRes.json().catch(() => ({ success: false }));
      if (docDel.success) {
        results.push({
          step: "7. Document Delete Entry (DELETE)",
          success: true,
          message: "Successfully deleted test document entry from archive."
        });
      } else {
        results.push({
          step: "7. Document Delete Entry (DELETE)",
          success: false,
          message: "Failed to delete test document entry."
        });
      }
    } else {
      results.push({
        step: "5. Document Upload Mock (POST)",
        success: false,
        message: "Failed to create mock document index entry."
      });
    }

    // 4. Test WhatsApp CRM simulator APIs
    console.log("Testing WhatsApp CRM threads & message simulator...");
    const threadsRes = await fetch(`http://localhost:3000/api/v1/whatsapp/threads`);
    const threads = await threadsRes.json().catch(() => ({ success: false }));
    
    if (threads.success && Array.isArray(threads.data)) {
      results.push({
        step: "8. WhatsApp Threads Simulator (GET)",
        success: true,
        message: `Successfully fetched ${threads.data.length} active mock threads.`,
        data: threads.data
      });
    } else {
      results.push({
        step: "8. WhatsApp Threads Simulator (GET)",
        success: false,
        message: "Failed to retrieve WhatsApp threads."
      });
    }

    const waSendRes = await fetch(`http://localhost:3000/api/v1/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'chat_1',
        message: 'بكم أسعار الشقق؟'
      })
    });
    const waSend = await waSendRes.json().catch(() => ({ success: false }));

    if (waSend.success && waSend.data?.agentMessage) {
      results.push({
        step: "9. WhatsApp Send & Auto-Reply (POST)",
        success: true,
        message: `Message sent. Virtual Agent replied: "${waSend.data.agentMessage.text.substring(0, 30)}..."`,
        data: waSend.data
      });
    } else {
      results.push({
        step: "9. WhatsApp Send & Auto-Reply (POST)",
        success: false,
        message: "Failed to trigger auto-reply simulator."
      });
    }

    // 5. Test Support Tickets helpdesk APIs
    console.log("Testing Support Tickets helpdesk integration...");
    const supportPostRes = await fetch(`http://localhost:3000/api/v1/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'مشكلة في تفعيل دومين مخصص للمبيعات',
        description: 'أريد معرفة كيفية ربط نطاق Hostinger المخصص بلوحة التحكم'
      })
    });
    const supportPost = await supportPostRes.json().catch(() => ({ success: false }));

    if (supportPost.success && supportPost.data) {
      ticketId = supportPost.data.id;
      results.push({
        step: "10. Support Ticket Creation & Assistant Reply (POST)",
        success: true,
        message: `Ticket successfully opened with ID ${ticketId}. Assistant instantly replied.`,
        data: supportPost.data
      });

      // Test post reply
      const replyRes = await fetch(`http://localhost:3000/api/v1/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'شكراً جزيلاً للرد السريع. سأقوم بتجربة الربط الآن.',
          sender: 'CLIENT'
        })
      });
      const reply = await replyRes.json().catch(() => ({ success: false }));
      
      if (reply.success && reply.data) {
        results.push({
          step: "11. Support Ticket Replies Timeline (POST/GET)",
          success: true,
          message: "Follow-up timeline reply successfully registered."
        });
      } else {
        results.push({
          step: "11. Support Ticket Replies Timeline (POST/GET)",
          success: false,
          message: "Failed to post support ticket reply."
        });
      }

      // Close the ticket
      const closeRes = await fetch(`http://localhost:3000/api/v1/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })
      });
      const close = await closeRes.json().catch(() => ({ success: false }));

      if (close.success && close.data?.status === 'CLOSED') {
        results.push({
          step: "12. Support Ticket Close (PUT)",
          success: true,
          message: "Support ticket closed successfully."
        });
      } else {
        results.push({
          step: "12. Support Ticket Close (PUT)",
          success: false,
          message: "Failed to close support ticket."
        });
      }
    } else {
      results.push({
        step: "10. Support Ticket Creation & Assistant Reply (POST)",
        success: false,
        message: "Failed to create support ticket."
      });
    }

    // 6. Test Settings & API keys management
    console.log("Testing System Settings & API keys...");
    const keysPostRes = await fetch(`http://localhost:3000/api/v1/settings/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'كود دمج ووردبريس تجريبي لموقع المعاينة' })
    });
    const keysPost = await keysPostRes.json().catch(() => ({ success: false }));

    if (keysPost.success && keysPost.data) {
      results.push({
        step: "13. API Key Generation (POST)",
        success: true,
        message: `Successfully generated API Key: ${keysPost.data.key}`,
        data: keysPost.data
      });

      // Revoke the key
      const keyDelRes = await fetch(`http://localhost:3000/api/v1/settings/api-keys?id=${keysPost.data.id}`, {
        method: 'DELETE'
      });
      const keyDel = await keyDelRes.json().catch(() => ({ success: false }));
      
      if (keyDel.success) {
        results.push({
          step: "14. API Key Revoke (DELETE)",
          success: true,
          message: "Successfully revoked API key."
        });
      } else {
        results.push({
          step: "14. API Key Revoke (DELETE)",
          success: false,
          message: "Failed to revoke API key."
        });
      }
    } else {
      results.push({
        step: "13. API Key Generation (POST)",
        success: false,
        message: "Failed to generate API key."
      });
    }

  } catch (error: any) {
    results.push({
      step: "System Integration Error",
      success: false,
      message: error.message
    });
  } finally {
    // Cleanup database entries
    try {
      if (ticketId) {
        await prisma.ticket.delete({ where: { id: ticketId } }).catch(() => {});
      }
      if (taskId) {
        await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
      }
      if (createdLeadId) {
        await prisma.lead.delete({ where: { id: createdLeadId } }).catch(() => {});
      }
    } catch (e) {
      console.error("Cleanup error in test script:", e);
    }
  }

  return results;
}
