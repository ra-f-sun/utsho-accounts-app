import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Select,
  Table,
  App,
  Space,
  Tag,
  Typography,
  Alert,
} from "antd";
import { ArrowLeftOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Title, Text } = Typography;

const MBCS_FROM_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MBCS_TO_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const classLabel = (c: number) => {
  if (c === 11) return "Graduated";
  return MBCS_CLASS_MAP[c] ?? `Class ${c}`;
};

export default function MbcsPromoteStudents() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [fromClass, setFromClass] = useState<number | undefined>(undefined);
  const [toClass, setToClass] = useState<number | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["mbcs", "students", { class: fromClass }],
    queryFn: () => studentsService.getAll("mbcs", { class: fromClass }, 1, 500),
    enabled: fromClass !== undefined,
  });

  const students: Student[] = data?.data?.data ?? [];

  const promoteMutation = useMutation({
    mutationFn: () =>
      studentsService.promoteBulk("mbcs", {
        fromClass: fromClass!,
        toClass: toClass!,
        notes: `Bulk promotion from ${classLabel(fromClass!)} to ${classLabel(toClass!)}`,
      }),
    onSuccess: (res) => {
      const promoted = (res as { data: { promoted: number } }).data?.promoted ?? 0;
      message.success(`Successfully promoted ${promoted} students to ${classLabel(toClass!)}`);
      setFromClass(undefined);
      setToClass(undefined);
      setSelectedRowKeys([]);
    },
    onError: () => message.error("Bulk promotion failed. Please try again."),
  });

  const columns: ColumnsType<Student> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Class",
      dataIndex: "class",
      key: "class",
      render: (c: number) => <Tag color="blue">{classLabel(c)}</Tag>,
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
      render: (s?: string) => s ?? "—",
    },
    {
      title: "Guardian",
      dataIndex: "guardianName",
      key: "guardianName",
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
    },
    {
      title: "Monthly Fee",
      dataIndex: "monthlyTuitionFee",
      key: "monthlyTuitionFee",
      render: (fee: number) => `৳${fee.toLocaleString()}`,
    },
  ];

  const canPromote =
    fromClass !== undefined &&
    toClass !== undefined &&
    toClass > fromClass &&
    students.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/mbcs/students")}>
          Back to Students
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Bulk Student Promotion — MBCS
        </Title>
        <div style={{ width: 120 }} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space size={16} wrap>
          <div>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              From Class
            </Text>
            <Select
              style={{ width: 200 }}
              placeholder="Select source class"
              value={fromClass}
              onChange={(val) => {
                setFromClass(val);
                setToClass(undefined);
                setSelectedRowKeys([]);
              }}
              options={MBCS_FROM_CLASSES.map((c) => ({ label: classLabel(c), value: c }))}
            />
          </div>
          <div>
            <Text strong style={{ display: "block", marginBottom: 4 }}>
              To Class
            </Text>
            <Select
              style={{ width: 200 }}
              placeholder="Select target class"
              value={toClass}
              onChange={setToClass}
              disabled={fromClass === undefined}
              options={MBCS_TO_CLASSES.filter((c) => c > (fromClass ?? -1)).map((c) => ({
                label: classLabel(c),
                value: c,
              }))}
            />
          </div>
          <div style={{ paddingTop: 24 }}>
            <Button
              type="primary"
              icon={<VerticalAlignTopOutlined />}
              disabled={!canPromote}
              loading={promoteMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: "Confirm Bulk Promotion",
                  content: `You are about to promote all ${students.length} student${students.length > 1 ? "s" : ""} from ${classLabel(fromClass!)} to ${classLabel(toClass!)}. This action cannot be undone. Continue?`,
                  okText: "Promote",
                  okType: "primary",
                  onOk: () => promoteMutation.mutate(),
                })
              }
            >
              Promote All ({students.length})
            </Button>
          </div>
        </Space>
      </Card>

      {fromClass !== undefined && (
        <>
          {students.length === 0 && !isLoading ? (
            <Alert
              type="info"
              message={`No active students found in ${classLabel(fromClass)}.`}
            />
          ) : (
            <Card title={`Students in ${classLabel(fromClass)} (${students.length})`}>
              <Table
                columns={columns}
                dataSource={students}
                rowKey="id"
                loading={isLoading}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[]),
                }}
                pagination={{ pageSize: 20 }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
