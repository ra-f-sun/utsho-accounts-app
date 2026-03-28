import { useState, useMemo } from "react";
import {
  App,
  Card,
  Tabs,
  Select,
  Button,
  Upload,
  Table,
  Alert,
  Space,
  Row,
  Col,
  Tag,
  Statistic,
  Spin,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  ImportOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { studentsService, type Student } from "../../services/studentsService";
import { mbcsStudentsService, type MbcsStudent } from "../../services/mbcsStudentsService";
import { mecStudentsService, type MecStudent } from "../../services/mecStudentsService";
import { downloadTemplate, parseImportFile } from "../../utils/studentImportExport";
import { useAuthStore } from "../../stores/authStore";
import type { ApiResponse, PaginatedResponse } from "../../lib/axios";
import * as XLSX from "xlsx";

type AnyStudent = Student | MbcsStudent | MecStudent;
type StudentRecord = Record<string, string | number | boolean | undefined | null>;

type OrgType = "uac" | "mbcs" | "mec";

const orgLabels: Record<OrgType, string> = {
  uac: "Utsho Admission Coaching (UAC)",
  mbcs: "Morning Bell Childhood School (MBCS)",
  mec: "Mastermind English Camp (MEC)",
};

export default function ImportExportStudents() {
  const user = useAuthStore((s) => s.user);

  // Determine which orgs the user can access
  const allowedOrgs = useMemo(() => {
    const role = user?.role;
    if (role === "SUPER_ADMIN" || role === "DIRECTOR") return ["uac", "mbcs", "mec"] as OrgType[];
    if (role === "ACCOUNTANT_UAC") return ["uac"] as OrgType[];
    if (role === "ACCOUNTANT_MBCS") return ["mbcs"] as OrgType[];
    if (role === "ACCOUNTANT_MEC") return ["mec"] as OrgType[];
    return [] as OrgType[];
  }, [user]);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "DIRECTOR";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2>Import & Export Students</h2>
      <Tabs
        defaultActiveKey="export"
        items={[
          {
            key: "export",
            label: "Export Students",
            children: <ExportTab allowedOrgs={allowedOrgs} />,
          },
          ...(isAdmin
            ? [
                {
                  key: "import",
                  label: "Import Students",
                  children: <ImportTab allowedOrgs={allowedOrgs} />,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

// ======================== EXPORT TAB ========================

function ExportTab({ allowedOrgs }: { allowedOrgs: OrgType[] }) {
  const { message } = App.useApp();
  const [org, setOrg] = useState<OrgType>(allowedOrgs[0] || "uac");
  const [classFilter, setClassFilter] = useState<number | undefined>();
  const [exporting, setExporting] = useState(false);

  const { data: studentsData, isLoading } = useQuery<PaginatedResponse<AnyStudent>>({
    queryKey: [`${org}-students-export`, classFilter],
    queryFn: () => {
      const filters: Record<string, number> = {};
      if (classFilter) filters.class = classFilter;
      if (org === "uac") return studentsService.getAll(filters, 1, 10000);
      if (org === "mbcs") return mbcsStudentsService.getAll(filters, 1, 10000);
      return mecStudentsService.getAll(filters, 1, 10000);
    },
  });

  const students = studentsData?.data?.data || [];

  const classOptions = org === "uac"
    ? [8, 9, 10, 11, 12]
    : org === "mbcs"
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      : [];

  const handleExport = () => {
    if (students.length === 0) {
      message.warning("No students to export");
      return;
    }
    setExporting(true);
    try {
      // Build export columns based on org
      const exportData = students.map((s) => {
        const row: StudentRecord = {
          Name: s.name,
          Gender: s.gender,
          "Date of Birth": s.dateOfBirth?.substring(0, 10),
          Class: s.class,
        };

        if (org === "uac") {
          row["Group"] = (s as Student).group || "";
          row["School"] = (s as Student).school || "";
        } else if (org === "mbcs") {
          row["Shift"] = (s as MbcsStudent).shift || "";
          row["Branch"] = (s as MbcsStudent).branch || "";
        } else {
          row["Group"] = (s as MecStudent).group || "";
        }

        Object.assign(row, {
          Section: s.section || "",
          "Serial No": s.serialNo || "",
          "Guardian Name": s.guardianName,
          "Contact Number": s.contactNumber,
          "Monthly Tuition Fee": s.monthlyTuitionFee,
          "Father Name": s.fatherName || "",
          "Father Mobile": s.fatherMobile || "",
          "Father Occupation": s.fatherOccupation || "",
          "Mother Name": s.motherName || "",
          "Mother Mobile": s.motherMobile || "",
          "Mother Occupation": s.motherOccupation || "",
          "Present Address": s.presentAddress || "",
          "Admission Fee": s.admissionFee || "",
          "Admission Date": s.admissionDate?.substring(0, 10) || "",
          "Readmission Fee": s.readmissionFee || "",
          "Discount Tuition": s.discountTuition || "",
          "Discount Admission": s.discountAdmission || "",
          "Discount Readmission": s.discountReadmission || "",
          Active: s.isActive ? "Yes" : "No",
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = Object.keys(exportData[0]).map((k) => ({
        wch: Math.max(k.length + 2, 15),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");

      const orgName = org.toUpperCase();
      const classStr = classFilter ? `_Class${classFilter}` : "";
      XLSX.writeFile(wb, `${orgName}_Students${classStr}_Export.xlsx`);
      message.success(`Exported ${students.length} students`);
    } catch {
      message.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Organization</label>
          <Select
            value={org}
            onChange={(v) => { setOrg(v); setClassFilter(undefined); }}
            style={{ width: "100%" }}
            options={allowedOrgs.map((o) => ({ value: o, label: orgLabels[o] }))}
          />
        </Col>
        <Col span={6}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Class (optional)</label>
          <Select
            value={classFilter}
            onChange={setClassFilter}
            allowClear
            placeholder="All classes"
            style={{ width: "100%" }}
            options={classOptions.map((c) => ({ value: c, label: `Class ${c}` }))}
          />
        </Col>
        <Col span={4} style={{ display: "flex", alignItems: "flex-end" }}>
          <Statistic title="Students" value={isLoading ? "..." : students.length} />
        </Col>
        <Col span={6} style={{ display: "flex", alignItems: "flex-end" }}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={isLoading || students.length === 0}
            size="large"
          >
            Export to Excel
          </Button>
        </Col>
      </Row>
      {isLoading && <Spin style={{ display: "block", marginTop: 16 }} />}
    </Card>
  );
}

// ======================== IMPORT TAB ========================

function ImportTab({ allowedOrgs }: { allowedOrgs: OrgType[] }) {
  const { message } = App.useApp();
  const [org, setOrg] = useState<OrgType>(allowedOrgs[0] || "uac");
  const [parsedData, setParsedData] = useState<StudentRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const queryClient = useQueryClient();

  const importMutation = useMutation<ApiResponse<AnyStudent[]>, Error, StudentRecord[]>({
    mutationFn: async (students) => {
      if (org === "uac") return studentsService.importStudents(students as unknown as Parameters<typeof studentsService.importStudents>[0]);
      if (org === "mbcs") return mbcsStudentsService.importStudents(students as unknown as Parameters<typeof mbcsStudentsService.importStudents>[0]) as Promise<ApiResponse<AnyStudent[]>>;
      return mecStudentsService.importStudents(students as unknown as Parameters<typeof mecStudentsService.importStudents>[0]) as Promise<ApiResponse<AnyStudent[]>>;
    },
    onSuccess: (response) => {
      const count = Array.isArray(response?.data) ? response.data.length : parsedData.length;
      message.success(`Successfully imported ${count} students!`);
      setParsedData([]);
      setParseErrors([]);
      setFileList([]);
      queryClient.invalidateQueries({ queryKey: [`${org}-students`] });
      // Also invalidate common queries
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["mbcs-students"] });
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
    },
    onError: (error: Error) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : error.message;
      if (Array.isArray(msg)) {
        setParseErrors(msg.map(String));
      } else {
        message.error(msg || "Import failed. Please check the data and try again.");
      }
    },
  });

  const handleFileUpload = async (file: File) => {
    setParsing(true);
    setParseErrors([]);
    setParsedData([]);
    try {
      const result = await parseImportFile(file, org);
      setParsedData(result.data);
      setParseErrors(result.errors);
      if (result.data.length > 0 && result.errors.length === 0) {
        message.success(`Parsed ${result.data.length} students from file`);
      } else if (result.data.length > 0 && result.errors.length > 0) {
        message.warning(`Parsed ${result.data.length} students with ${result.errors.length} warnings`);
      }
    } catch {
      message.error("Failed to parse file");
    } finally {
      setParsing(false);
    }
    return false; // prevent auto upload
  };

  const handleImport = () => {
    if (parseErrors.length > 0) {
      message.error("Please fix all errors before importing");
      return;
    }
    if (parsedData.length === 0) {
      message.error("No data to import");
      return;
    }
    importMutation.mutate(parsedData);
  };

  const previewColumns = [
    { title: "#", key: "idx", width: 50, render: (_: unknown, __: unknown, idx: number) => idx + 1 },
    { title: "Name", dataIndex: "name", key: "name", width: 150 },
    { title: "Gender", dataIndex: "gender", key: "gender", width: 80 },
    { title: "Class", dataIndex: "class", key: "class", width: 70 },
    { title: "Guardian", dataIndex: "guardianName", key: "guardianName", width: 140 },
    { title: "Contact", dataIndex: "contactNumber", key: "contactNumber", width: 130 },
    { title: "Fee", dataIndex: "monthlyTuitionFee", key: "monthlyTuitionFee", width: 80,
      render: (v: number) => v ? `৳${v}` : "-" },
    ...(org === "uac" ? [{ title: "Group", dataIndex: "group", key: "group", width: 80 }] : []),
    ...(org === "mbcs" ? [{ title: "Shift", dataIndex: "shift", key: "shift", width: 80 }] : []),
  ];

  return (
    <Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Organization</label>
          <Select
            value={org}
            onChange={(v) => { setOrg(v); setParsedData([]); setParseErrors([]); setFileList([]); }}
            style={{ width: "100%" }}
            options={allowedOrgs.map((o) => ({ value: o, label: orgLabels[o] }))}
          />
        </Col>
        <Col span={8}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Step 1: Download Template</label>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() => downloadTemplate(org)}
          >
            Download Template
          </Button>
        </Col>
        <Col span={8}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Step 2: Upload Filled File</label>
          <Upload
            accept=".xlsx,.xls,.csv"
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([file as unknown as UploadFile]);
              handleFileUpload(file);
              return false;
            }}
            onRemove={() => {
              setFileList([]);
              setParsedData([]);
              setParseErrors([]);
            }}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} loading={parsing}>
              Select File
            </Button>
          </Upload>
        </Col>
      </Row>

      {parseErrors.length > 0 && (
        <Alert
          type="error"
          message={`${parseErrors.length} Error(s) Found`}
          description={
            <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 200, overflow: "auto" }}>
              {parseErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          }
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {parsedData.length > 0 && (
        <>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <Space>
              <Tag color="blue">{parsedData.length} students ready</Tag>
              {parseErrors.length === 0 && <Tag color="green">No errors</Tag>}
            </Space>
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={handleImport}
              loading={importMutation.isPending}
              disabled={parseErrors.length > 0}
              size="large"
            >
              Import {parsedData.length} Students
            </Button>
          </div>
          <Table
            columns={previewColumns}
            dataSource={parsedData}
            rowKey={(_, idx) => String(idx)}
            size="small"
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `${total} students`,
            }}
          />
        </>
      )}

      {parsedData.length === 0 && fileList.length === 0 && (
        <Alert
          type="info"
          message="How to import students"
          description={
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Select the organization</li>
              <li>Download the Excel template</li>
              <li>Fill in student data (required fields marked with *)</li>
              <li>Upload the filled file</li>
              <li>Review the preview and click Import</li>
            </ol>
          }
        />
      )}
    </Card>
  );
}
