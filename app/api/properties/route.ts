// app/api/properties/route.ts
import { NextResponse } from 'next/server';

const mockProperties = [
  {
    id: 'T-001',
    title: 'شقة الياسمين الذكية - جولة 360',
    type: 'apartment',
    status: 'available',
    price: 1100000,
    beds: 3,
    area: 130,
    city: 'الرياض',
    district: 'الياسمين',
    agent: 'المستشار رائد الغامدي',
    posted: '2026-05-15',
    coords: { lat: 24.7921, lng: 46.6432 },
    description: 'شقة بنظام سمارت كامل تشمل الإضاءة والتكييف، واجهة شمالية تطل على حديقة الحي، تشطيبات مودرن ممتازة ومطبخ راكب.',
    media: ['https://picsum.photos/seed/tour1/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.95,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  },
  {
    id: 'T-002',
    title: 'فيلا قرطبة الكلاسيكية - فيديو',
    type: 'villa',
    status: 'available',
    price: 4200000,
    beds: 5,
    area: 400,
    city: 'الرياض',
    district: 'قرطبة',
    agent: 'المستشار فواز الشهري',
    posted: '2026-05-12',
    coords: { lat: 24.811, lng: 46.721 },
    description: 'فيلا كلاسيكية رائعة تقع في زاوية ممتازة بحي قرطبة، حوش واسع يتسع لثلاث سيارات، ملحق خارجي، ومجالس ضيافة منفصلة.',
    media: ['https://picsum.photos/seed/tour2/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.9,
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-003',
    title: 'شقة الملقا الفاخرة - بدون ميديا',
    type: 'apartment',
    status: 'available',
    price: 1800000,
    beds: 3,
    area: 160,
    city: 'الرياض',
    district: 'الملقا',
    agent: 'المستشار عبدالرحمن العتيبي',
    posted: '2026-05-20',
    coords: { lat: 24.781, lng: 46.611 },
    description: 'شقة دوبلكس واسعة في موقع استراتيجي بحي الملقا قريبة من طريق الملك سلمان، لم ترفع لها ميديا بعد للتحديث الجاري.',
    media: [],
    needsDetailedView: false,
    dataCompleteness: 0.85,
    tourType: '360',
    tourUrl: ''
  },
  {
    id: 'T-004',
    title: 'فيلا الغدير - سعر غير معرف',
    type: 'villa',
    status: 'available',
    price: 0,
    beds: 4,
    area: 380,
    city: 'الرياض',
    district: 'الغدير',
    agent: 'المستشار صالح الدوسري',
    posted: '2026-05-18',
    coords: { lat: 24.765, lng: 46.654 },
    description: 'فيلا ممتازة في حي الغدير الهادئ، تم الانتهاء من ترميمها بالكامل وجاري تقدير السعر النهائي بالتعاون مع المالك.',
    media: ['https://picsum.photos/seed/tour4/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.9,
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-005',
    title: 'بنتهاوس النرجس - reserved',
    type: 'apartment',
    status: 'reserved',
    price: 2100000,
    beds: 4,
    area: 220,
    city: 'الرياض',
    district: 'النرجس',
    agent: 'المستشار سعود السديري',
    posted: '2026-05-01',
    coords: { lat: 24.832, lng: 46.687 },
    description: 'شقة بنتهاوس رائعة مع سطح مستقل ومسبح إسكواش خاص، تم حجزها مؤقتاً لعميل قيد استخراج التمويل العقاري.',
    media: ['https://picsum.photos/seed/tour5/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.92,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  },
  {
    id: 'T-006',
    title: 'دوبلكس التعاون - اكتمال منخفض',
    type: 'apartment',
    status: 'available',
    price: 1550000,
    beds: 3,
    area: 180,
    city: 'الرياض',
    district: 'التعاون',
    agent: 'المستشار بدر الرشيد',
    posted: '2026-05-22',
    coords: { lat: 24.778, lng: 46.702 },
    description: 'دوبلكس متميز بتصميم أوروبي مودرن، تنقصه بعض المستندات وشهادة الإتمام، لذا فإن نسبة اكتمال البيانات منخفضة.',
    media: ['https://picsum.photos/seed/tour6/400/300'],
    needsDetailedView: false,
    dataCompleteness: 0.7,
    tourType: 'video',
    tourUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'T-007',
    title: 'فيلا حطين - force modal',
    type: 'villa',
    status: 'available',
    price: 5600000,
    beds: 6,
    area: 500,
    city: 'الرياض',
    district: 'حطين',
    agent: 'المستشار عمر النفيعي',
    posted: '2026-05-25',
    coords: { lat: 24.756, lng: 46.598 },
    description: 'فيلا قصور فاخرة جداً ذات مواصفات خاصة، تم تحديد خيار force modal لمراجعة الهوية ومستندات العميل بدقة قبل الإفصاح.',
    media: ['https://picsum.photos/seed/tour7/400/300'],
    needsDetailedView: true,
    dataCompleteness: 0.98,
    tourType: '360',
    tourUrl: 'https://vinc360.com/sample'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';

  let list = mockProperties;

  if (search) {
    list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.district.toLowerCase().includes(search.toLowerCase()));
  }
  if (type) {
    list = list.filter(p => p.type === type);
  }
  if (status) {
    list = list.filter(p => p.status === status);
  }

  return NextResponse.json({ success: true, data: list });
}
