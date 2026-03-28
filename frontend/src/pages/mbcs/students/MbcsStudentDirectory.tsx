import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  Card,
  Select,
  Row,
  Col,
  Button,
  DatePicker,
  Input,
  Typography,
  Tag,
  Space,
  Statistic,
} from "antd";
import {
  SearchOutlined,
  FileExcelOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import { MBCS_CLASS_MAP, MBCS_CLASSES } from "../../../constants/mbcsClasses";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function MbcsStudentDirectory() {
  const [classFilter, setClassFilter] = useState<number | undefined>();
  const [shiftFilter, setShiftFilter] = useState<string | undefined>();
  const [branchFilter, setBranchFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");
  const [admissionDateFrom, setAdmissionDateFrom] = useState<dayjs.Dayjs | null>(null);
  const [admissionDateTo, setAdmissionDateTo] = useState<dayjs.Dayjs | null>(null);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["mbcs", "students-directory"],
    queryFn: () => studentsService.getAll("mbcs", undefined, 1, 1000),
  });

  const allStudents: Student[] = useMemo(
    () => studentsData?.data?.data ?? [],
    [studentsData],
  );

  // Derive unique filter options
  const availableShifts = useMemo(
    () => [...new Set(allStudents.map((s) => s.shift).filter(Boolean) as string[])].sort(),
    [allStudents],
  );

  const availableBranches = useMemo(
    () => [...new Set(allStudents.map((s) => s.branch).filter(Boolean) as string[])].sort(),
    [allStudents],
  );

  // Apply filters
  const filtered = useMemo(() => {
    let result = allStudents.filter((s) => !s.associationEndDate);
    if (classFilter !== undefined) result = result.filter((s) => s.class === classFilter);
    if (shiftFilter) result = result.filter((s) => s.shift === shiftFilter);
    if (branchFilter) result = result.filter((s) => s.branch === branchFilter);
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.contactNumber?.toLowerCase().includes(q) ||
          s.guardianName?.toLowerCase().includes(q) ||
          s.fatherName?.toLowerCase().includes(q) ||
          s.motherName?.toLowerCase().includes(q),
      );
    }
    if (admissionDateFrom) {
      const from = admissionDateFrom.startOf("day");
      result = result.filter(
        (s) => s.admissionDate && !dayjs(s.admissionDate).isBefore(from, "day"),
      );
    }
    if (admissionDateTo) {
      const to = admissionDateTo.startOf("day");
      result = result.filter(
        (s) => s.admissionDate && !dayjs(s.admissionDate).isAfter(to, "day"),
      );
    }
    return result.sort((a, b) => {
      if (a.class !== b.class) return a.class - b.class;
      return a.name.localeCompare(b.name);
    });
  }, [allStudents, classFilter, shiftFilter, branchFilter, searchText, admissionDateFrom, admissionDateTo]);

  const setTodayAdmission = useCallback(() => {
    const today = dayjs();
    setAdmissionDateFrom(today);
    setAdmissionDateTo(today);
  }, []);

  const clearFilters = useCallback(() => {
    setClassFilter(undefined);
    setShiftFilter(undefined);
    setBranchFilter(undefined);
    setSearchText("");
    setAdmissionDateFrom(null);
    setAdmissionDateTo(null);
  }, []);

  // Excel export
  const exportToExcel = useCallback(() => {
    const headers = [
      "Serial No",
      "Name",
      "Class",
      "Shift",
      "Branch",
      "Gender",
      "Date of Birth",
      "Guardian Name",
      "Contact Number",
      "Father Name",
      "Father Mobile",
      "Mother Name",
      "Mother Mobile",
      "Address",
      "Monthly Tuition",
      "Admission Fee",
      "Admission Date",
    ];
    const rows = filtered.map((s, idx) => [
      idx + 1,
      s.name,
      MBCS_CLASS_MAP[s.class] ?? `Class ${s.class}`,
      s.shift ?? "",
      s.branch ?? "",
      s.gender ?? "",
      s.dateOfBirth ? dayjs(s.dateOfBirth).format("DD/MM/YYYY") : "",
      s.guardianName ?? "",
      s.contactNumber ?? "",
      s.fatherName ?? "",
      s.fatherMobile ?? "",
      s.motherName ?? "",
      s.motherMobile ?? "",
      s.presentAddress ?? "",
      s.monthlyTuitionFee ?? 0,
      s.admissionFee ?? 0,
      s.admissionDate ? dayjs(s.admissionDate).format("DD/MM/YYYY") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(","),
      ),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = dayjs().format("YYYY-MM-DD");
    const classStr = classFilter !== undefined ? `_${MBCS_CLASS_MAP[classFilter] ?? `Class${classFilter}`}` : "";
    link.download = `MBCS_Student_Directory${classStr}_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered, classFilter]);

  const columns: ColumnsType<Student> = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "Class",
      dataIndex: "class",
      key: "class",
      width: 120,
      sorter: (a, b) => a.class - b.class,
      render: (cls: number) => (
        <Tag color="blue">{MBCS_CLASS_MAP[cls] ?? `Class ${cls}`}</Tag>
      ),
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
      width: 100,
      render: (shift?: string) => shift ? <Tag>{shift}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: 120,
      render: (branch?: string) => branch || <Text type="secondary">—</Text>,
    },
    {
      title: "Guardian",
      dataIndex: "guardianName",
      key: "guardianName",
      width: 150,
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
      width: 140,
    },
    {
      title: "Tuition",
      dataIndex: "monthlyTuitionFee",
      key: "monthlyTuitionFee",
      width: 100,
      render: (fee: number) => `৳${(fee ?? 0).toLocaleString()}`,
      sorter: (a, b) => (a.monthlyTuitionFee ?? 0) - (b.monthlyTuitionFee ?? 0),
    },
    {
      title: "Admission Date",
      dataIndex: "admissionDate",
      key: "admissionDate",
      width: 130,
      render: (date?: string) =>
        date ? dayjs(date).format("DD/MM/YYYY") : <Text type="secondary">—</Text>,
      sorter: (a, b) =>
        new Date(a.admissionDate ?? 0).getTime() - new Date(b.admissionDate ?? 0).getTime(),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          MBCS Student Directory
        </Title>
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={exportToExcel}
          disabled={filtered.length === 0}
        >
          Export to Excel
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8} md={4}>
            <Select
              allowClear
              placeholder="All Classes"
              value={classFilter}
              onChange={setClassFilter}
              options={MBCS_CLASSES}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              allowClear
              placeholder="All Shifts"
              value={shiftFilter}
              onChange={setShiftFilter}
              options={availableShifts.map((s) => ({ value: s, label: s }))}
              style={{ width: "100%" }}
              disabled={availableShifts.length === 0}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              allowClear
              placeholder="All Branches"
              value={branchFilter}
              onChange={setBranchFilter}
              options={availableBranches.map((b) => ({ value: b, label: b }))}
              style={{ width: "100%" }}
              disabled={availableBranches.length === 0}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DatePicker
              placeholder="Adm. From"
              value={admissionDateFrom}
              onChange={setAdmissionDateFrom}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <DatePicker
              placeholder="Adm. To"
              value={admissionDateTo}
              onChange={setAdmissionDateTo}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} md={4}>
            <Space>
              <Button
                icon={<CalendarOutlined />}
                onClick={setTodayAdmission}
                title="Today's Admissions"
              >
                Today
              </Button>
              <Button onClick={clearFilters}>Clear</Button>
            </Space>
          </Col>
        </Row>
        <Row style={{ marginTop: 12 }}>
          <Col span={8}>
            <Input
              placeholder="Search by name, contact, guardian..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col flex="auto" style={{ textAlign: "right", paddingTop: 4 }}>
            <Text type="secondary">
              Showing <strong>{filtered.length}</strong> of{" "}
              {allStudents.filter((s) => !s.associationEndDate).length} active students
            </Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Students"
              value={filtered.length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Classes Represented"
              value={new Set(filtered.map((s) => s.class)).size}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Avg. Tuition"
              value={
                filtered.length > 0
                  ? `৳${Math.round(filtered.reduce((s, st) => s + (st.monthlyTuitionFee ?? 0), 0) / filtered.length)}`
                  : "—"
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Monthly Tuition"
              value={`৳${filtered.reduce((s, st) => s + (st.monthlyTuitionFee ?? 0), 0).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ["25", "50", "100", "200"],
            showTotal: (total) => `Total ${total} students`,
          }}
          size="small"
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
}
