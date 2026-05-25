// app/actions/onboarding.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * إكمال بيانات ملف المنشأة العقارية وتحديث الاسم التجاري والوثائق
 */
export async function completeOnboardingAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    
    const companyName = formData.get("companyName") as string;
    const city = formData.get("city") as string;
    const documentNumber = formData.get("documentNumber") as string;
    const phone = formData.get("phone") as string;

    if (!companyName || !city || !documentNumber || !phone) {
      throw new Error("جميع الحقول مطلوبة لإتمام وتنشيط ملف منشأتك العقارية.");
    }

    // تحديث الاسم والبيانات الفعلية للمستأجر الحالي
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        companyName: companyName.trim(),
        // يمكنك حفظ بقية الوثائق محلياً في جداول التراخيص لاحقاً
      }
    });

    // إعادة إنعاش الكاش لتحديث واجهة لوحة التحكم والـ Sidebar بالاسم الجديد فوراً
    revalidatePath("/operations/layout");
    revalidatePath("/operations/settings");
    revalidatePath("/operations/analytics");
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}