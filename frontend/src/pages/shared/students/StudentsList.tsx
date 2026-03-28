import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Input, Select, Space, App, Popconfirm, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { studentsService } from "../../../services/studentsService";
import type { Student, FilterStudentDto } from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import { useDebouncedValue } from "../../../utils/useDebouncedValue";
import { UAC_CLASS_FILTER_OPTIONS, uacClassLabel } from "../../../constants/uacClasses";
import { MBCS_CLASSES, MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Option } = Select;

type OrgType = "uac" | "mbcs" | "mec";

interface OrgConfig {
  classOptions: { value: number; label: string }[] | null;
  secondaryFilterField: "group" | "shift" | null;
  secondaryFilterLabel: string;
  secondaryFilterOptions: { value: string; label: string }[] | null;
  tertiaryFilterField: "school" | null;
  titleHeader: string | null;
  deleteConfirmText: string;
  midColumns: ColumnsType<Student>;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    classOptions: UAC_CLASS_FILTER_OPTIONS,
    secondaryFilterField: "group",
    secondaryFilterLabel: "Group",
    secondaryFilterOptions: [
      { value: "science", label: "Science" },
      { value: "business", label: "Business" },
    ],
    tertiaryFilterField: "school",
    titleHeader: null,
    deleteConfirmText: "Are you sure to delete this student?",
    midColumns: [
      {
        title: "Class",
        dataIndex: "class",
        key: "class",
        width: 80,
        render: (cls: number) => uacClassLabel(cls),
      },
      {
        title: "Group",
        dataIndex: "group",
        key: "group",
        width: 100,
        render: (g?: string) => (g ? <Tag color="blue">{g.toUpperCase()}</Tag> : "-"),
      },
      { title: "School", dataIndex: "school", key: "school", ellipsis: true },
    ],
  },
  mbcs: {
    classOptions: MBCS_CLASSES,
    secondaryFilterField: "shift",
    secondaryFilterLabel: "Shift",
    secondaryFilterOptions: [
      { value: "morning", label: "Morning" },
      { value: "day", label: "Day" },
    ],
    tertiaryFilterField: null,
    titleHeader: null,
    deleteConfirmText: "Are you sure to delete this student?",
    midColumns: [
      {
        title: "Class",
        dataIndex: "class",
        key: "class",
        width: 120,
        render: (cls: number) => MBCS_CLASS_MAP[cls] ?? `Class ${cls}`,
      },
      {
        title: "Shift",
        dataIndex: "shift",
        key: "shift",
        width: 100,
        render: (s?: string) =>
          s ? (
            <Tag color={s === "morning" ? "orange" : "blue"}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Tag>
          ) : (
            "-"
          ),
      },
      { title: "Branch", dataIndex: "branch", key: "branch", ellipsis: true },
    ],
  },
  mec: {
    classOptions: null,
    secondaryFilterField: null,
    secondaryFilterLabel: "",
    secondaryFilterOptions: null,
    tertiaryFilterField: null,
    titleHeader: "MEC Students",
    deleteConfirmText: "Deactivate this student?",
    midColumns: [
      {
        title: "Class",
        dataIndex: "class",
        key: "class",
        width: 80,
        render: (cls?: number) => cls ?? "-",
      },
      {
        title: "Group",
        dataIndex: "group",
        key: "group",
        width: 100,
        render: (g?: string) => (g ? <Tag color="blue">{g}</Tag> : "-"),
      },
    ],
  },
};

export default function StudentsList({ org }: { org: OrgType }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = ORG_CONFIG[org];

  const [filters, setFilters] = useState<FilterStudentDto>({});
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [org, "students", { ...filters, search: debouncedSearch || undefined }, page],
    queryFn: () =>
      studentsService.getAll(org, { ...filters, search: debouncedSearch || undefined }, page),
  });

  const students: Student[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsService.delete(org, id),
    onSuccess: () => {
      message.success("Student deleted successfully");
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
    },
    onError: () => message.error("Failed to delete student"),
  });

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const feeColumn: ColumnsType<Student>[number] = {
    title: "Monthly Fee",
    dataIndex: "monthlyTuitionFee",
    key: "monthlyTuitionFee",
    render: (fee: number) =>
      org === "mec" ? (
        <strong style={{ color: "#2e7d32" }}>৳{fee.toLocaleString()}</strong>
      ) : (
        `৳${fee.toLocaleString()}`
      ),
  };

  const columns: ColumnsType<Student> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    ...config.midColumns,
    { title: "Guardian", dataIndex: "guardianName", key: "guardianName" },
    { title: "Contact", dataIndex: "contactNumber", key: "contactNumber" },
    feeColumn,
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Student) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/${org}/students/${record.id}/payments`)}
            title="Payment History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/${org}/students/edit/${record.id}`)}
          />
          <Popconfirm
            title={config.deleteConfirmText}
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {config.titleHeader && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{config.titleHeader}</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/${org}/students/add`)}
          >
            Add Student
          </Button>
        </div>
      )}

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Space wrap>
          <Input
            placeholder="Search by name, contact, or guardian"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          {config.classOptions && (
            <Select
              placeholder="Class"
              style={{ width: 120 }}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, class: value || undefined }))
              }
              allowClear
            >
              {config.classOptions.map(({ value, label }) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          )}
          {config.secondaryFilterField && config.secondaryFilterOptions && (
            <Select
              placeholder={config.secondaryFilterLabel}
              style={{ width: 120 }}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  [config.secondaryFilterField!]: value || undefined,
                }))
              }
              allowClear
            >
              {config.secondaryFilterOptions.map(({ value, label }) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          )}
          {config.tertiaryFilterField && (
            <Input
              placeholder="School"
              style={{ width: 200 }}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  school: e.target.value || undefined,
                }))
              }
              allowClear
            />
          )}
        </Space>
        {!config.titleHeader && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/${org}/students/add`)}
          >
            Add Student
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={students}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} students`,
        }}
      />
    </div>
  );
}
