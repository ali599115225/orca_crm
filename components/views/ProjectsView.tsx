'use client';
import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Card, Badge, DataTable } from '../ui/orca-components';

export default function ProjectsView() {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = [
    { header: 'اسم المشروع', accessor: 'name' },
    { header: 'الموقع', accessor: 'location' },
    { header: 'الحالة', accessor: 'status' },
  ];

  const data = [
    { name: 'مجمع ريزيدنس الفضي 6', location: 'الرياض - النرجس', status: <Badge text="قيد التنفيذ" color="blue" /> },
    { name: 'أبراج أبعاد السكنية', location: 'جدة - أبحر', status: <Badge text="مكتمل" color="green" /> },
  ];

  return (
    <div className="orca-page orca-stack">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة المشاريع العقارية</h1>
        <Button icon={Plus}>إضافة مشروع</Button>
      </div>
      <Card>
        <DataTable columns={columns} data={data} />
      </Card>
    </div>
  );
}
