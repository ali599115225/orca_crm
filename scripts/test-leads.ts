// scripts/test-leads.ts
import { prisma } from "../lib/prisma";

export interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

export async function runLeadsTestSuite(tenantId: string, userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let leadId = "";
  let contactId = "";
  let oppId = "";
  let tourId = "";
  let offerId = "";
  let taskId = "";
  let contractId = "";
  let mockProjectId = "";
  let mockUnitId = "";

  try {
    // 0. Setup mock Project and Unit to ensure the test always has inventory to link
    let project = await prisma.project.findFirst({
      where: { tenantId },
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          tenantId,
          name: "مشروع النرجس التجريبي - اختبار تلقائي",
          city: "الرياض",
          status: "PLANNING",
        },
      });
      mockProjectId = project.id;
    }

    const unitNumber = "U-TEST-" + Math.floor(Math.random() * 100000);
    const unit = await prisma.unit.create({
      data: {
        tenantId,
        projectId: project.id,
        unitNumber,
        floorPosition: 2,
        priceSar: 750000,
        status: "Available",
      },
    });
    mockUnitId = unit.id;

    results.push({
      step: "0. تهيئة البيئة (Setup project and unit)",
      success: true,
      message: `تم إنشاء وحدة اختبار متاحة رقم ${unitNumber}`,
    });

    // 1. Create Lead
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        firstName: "اختبار",
        lastName: "العميل التلقائي",
        phone: "+966500000099",
        email: "test.lead@orca.crm",
        city: "الرياض",
        source: "حملة تجريبية",
        status: "NEW",
        stage: "New",
        leadScore: 85,
        score: 85,
        projectId: project.id,
        unitId: unit.id,
        createdBy: userId,
      },
    });
    leadId = lead.id;
    results.push({
      step: "1. إنشاء عميل محتمل (Create Lead)",
      success: true,
      message: `تم إنشاء الليد بنجاح بالمعرف ${lead.id}`,
      data: lead,
    });

    // 2. Map Lead to Contact
    const contact = await prisma.contact.create({
      data: {
        tenantId,
        leadId,
        name: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        phone: lead.phone,
        email: lead.email,
        preferredContactTime: "٤:٠٠ م - ٦:٠0 م",
        budgetRange: "٥٠٠,٠٠٠ - ٨٠٠,٠٠٠ ر.س",
        notes: "تمت مزامنة العميل تلقائياً عند الإنشاء.",
        createdBy: userId,
      },
    });
    contactId = contact.id;
    results.push({
      step: "2. دفتر العملاء (Create Contact)",
      success: true,
      message: `تم إنشاء جهة الاتصال بنجاح بالمعرف ${contact.id}`,
      data: contact,
    });

    // 3. Create Opportunity
    const opp = await prisma.opportunity.create({
      data: {
        tenantId,
        leadId,
        value: 750000,
        probability: 60,
        closeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        linkedUnitIds: unit.id,
        createdBy: userId,
      },
    });
    oppId = opp.id;
    results.push({
      step: "3. الفرص البيعية (Create Opportunity)",
      success: true,
      message: `تم إنشاء الفرصة بنجاح بالمعرف ${opp.id}`,
      data: opp,
    });

    // 4. Schedule Tour
    const tour = await prisma.tour.create({
      data: {
        tenantId,
        leadId,
        assignedTo: userId,
        startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: "مشروع النرجس السكني",
        status: "SCHEDULED",
        attendees: 2,
        createdBy: userId,
      },
    });
    tourId = tour.id;
    results.push({
      step: "4. الجولات العقارية (Schedule Tour)",
      success: true,
      message: `تم جدولة الجولة بنجاح بالمعرف ${tour.id}`,
      data: tour,
    });

    // 5. Complete Tour (Triggering Auto-Task and status updates in test)
    await prisma.tour.update({
      where: { id: tourId },
      data: { status: "COMPLETED" },
    });

    // Generate the automated task (simulating PATCH route behavior)
    const autoTask = await prisma.task.create({
      data: {
        tenantId,
        leadId,
        assignedTo: userId,
        title: "متابعة العميل وإرسال عرض السعر بعد إتمام الجولة العقارية الميدانية",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: "HIGH",
        status: "PENDING",
        createdBy: userId,
      },
    });
    taskId = autoTask.id;

    results.push({
      step: "5. إتمام الجولة والمتابعة (Complete Tour & Trigger Task)",
      success: true,
      message: `تم إتمام الجولة بنجاح وجدولة مهمة متابعة تلقائية بالمعرف ${autoTask.id}`,
      data: autoTask,
    });

    // 6. Create Offer
    const offer = await prisma.offer.create({
      data: {
        tenantId,
        linkedOpportunityId: oppId,
        price: 720000,
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        createdBy: userId,
      },
    });
    offerId = offer.id;
    results.push({
      step: "6. تقديم عرض السعر (Send Offer)",
      success: true,
      message: `تم تقديم عرض سعر مخفض بنسبة ٤٪ بالمعرف ${offer.id}`,
      data: offer,
    });

    // 7. Accept Offer (Triggering Auto-Contract Generation in test)
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED" },
    });

    // Generate contract linked to the mock unit
    const contract = await prisma.contract.create({
      data: {
        tenantId,
        unitId: unit.id,
        buyerName: "اختبار العميل التلقائي",
        buyerPhone: "+966500000099",
        totalVolumeSar: offer.price,
        signedAt: new Date(),
      },
    });
    contractId = contract.id;

    // Mark unit as sold
    await prisma.unit.update({
      where: { id: unit.id },
      data: { status: "Sold" },
    });

    results.push({
      step: "7. قبول العرض وتوقيع العقد (Accept Offer & Create Contract)",
      success: true,
      message: `تم قبول العرض وصياغة عقد بيع لوحدة رقم ${unit.unitNumber} بالمعرف ${contract.id}`,
      data: contract,
    });

  } catch (error: any) {
    results.push({
      step: "خطأ غير متوقع",
      success: false,
      message: error.message,
    });
  } finally {
    // --- CLEANUP TEST RECORDS to keep database pristine ---
    try {
      if (contractId) {
        await prisma.contract.delete({ where: { id: contractId } }).catch(() => {});
      }
      if (offerId) {
        await prisma.offer.delete({ where: { id: offerId } }).catch(() => {});
      }
      if (taskId) {
        await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
      }
      if (tourId) {
        await prisma.tour.delete({ where: { id: tourId } }).catch(() => {});
      }
      if (oppId) {
        await prisma.opportunity.delete({ where: { id: oppId } }).catch(() => {});
      }
      if (contactId) {
        await prisma.contact.delete({ where: { id: contactId } }).catch(() => {});
      }
      if (leadId) {
        await prisma.lead.delete({ where: { id: leadId } }).catch(() => {});
      }
      if (mockUnitId) {
        await prisma.unit.delete({ where: { id: mockUnitId } }).catch(() => {});
      }
      if (mockProjectId) {
        await prisma.project.delete({ where: { id: mockProjectId } }).catch(() => {});
      }
    } catch (e) {
      console.error("Cleanup error in test suite:", e);
    }
  }

  return results;
}
