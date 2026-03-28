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
import { uacClassLabel } from "../../../constants/uacClasses";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Title, Text } = Typography;

type OrgType = "uac" | "mbcs";

interface OrgConfig {
  fromClasses: number[];
  toClasses: number[];
  classLabel: (c: number) => string;
  hasRowSelection: boolean;
  promoteButtonLabel: (n: number) => string;
  showShiftColumn: boolean;
  title: string;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    fromClasses: [8, 9, 10, 11, 12],
    toClasses: [9, 10, 11, 12, 13],
    classLabel: (c) => uacClassLabel(c),
    hasRowSelection: true,
    promoteButtonLabel: (n) => `Promote Selected (${n})`,
    showShiftColumn: false,
    title: "Bulk Student Promotion — UAC",
  },
  mbcs: {
    fromClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    toClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    classLabel: (c) => (c === 11 ? "Graduated" : MBCS_CLASS_MAP[c] ?? `Class ${c}`),
    hasRowSelection: false,
    promoteButtonLabel: (n) => `Promote All (${n})`,
    showShiftColumn: true,
    title: "Bulk Student Promotion — MBCS",
  },
};

export default function PromoteStudents({ org }: { org: OrgType }) {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const config = ORG_CONFIG[org];

  const [fromClass, setFromClass] = useState<number | undefined>(undefined);
  const [toClass, setToClass] = useState<number | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: [org, "students", { class: fromClass }],
    queryFn: () => studentsService.getAll(org, { class: fromClass }, 1, 500),
    enabled: fromClass !== undefined,
  });

  const students: Student[] = data?.data?.data ?? [];

  const promoteMutation = useMutation({
    mutationFn: () =>
      studentsService.promoteBulk(org, {
        fromClass: fromClass!,
        toClass: toClass!,
        ...(config.hasRowSelection ? { studentIds: selectedRowKeys } : {}),
        notes: `Bulk promotion from ${config.classLabel(fromClass!)} to ${config.classLabel(toClass!)}`,
      }),
    onSuccess: (res) => {
      const promoted = (res as { data: { promoted: number } }).data?.promoted ?? 0;
      message.success(
        `Successfully promoted ${promoted} students to ${config.classLabel(toClass!)}`,
      );
      setFromClass(undefined);
      setToClass(undefined);
      setSelectedRowKeys([]);
    },
    onError: () => message.error("Bulk promotion failed. Please try again."),
  });

  const canPromote =
    fromClass !== undefined &&
    toClass !== undefined &&
    toClass > fromClass &&
    students.length > 0 &&
    (!config.hasRowSelection || selectedRowKeys.length > 0);

  const confirmCount = config.hasRowSelection ? selectedRowKeys.length : students.length;

  const columns: ColumnsType<Student> = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Class",
      dataIndex: "class",
      key: "class",
      render: (c: number) => <Tag color="blue">{config.classLabel(c)}</Tag>,
    },
    ...(config.showShiftColumn
      ? [{ title: "Shift", dataIndex: "shift", key: "shift", render: (s?: string) => s ?? "—" }]
      : []),
    { title: "Guardian", dataIndex: "guardianName", key: "guardianName" },
    { title: "Contact", dataIndex: "contactNumber", key: "contactNumber" },
    {
      title: "Monthly Fee",
      dataIndex: "monthlyTuitionFee",
      key: "monthlyTuitionFee",
      render: (fee: number) => `৳${fee.toLocaleString()}`,
    },
  ];

  return (
    <div>
      <div
        style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${org}/students`)}
        >
          Back to Students
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {config.title}
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
              options={config.fromClasses.map((c) => ({
                label: config.classLabel(c),
                value: c,
              }))}
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
              options={config.toClasses
                .filter((c) => c > (fromClass ?? -1))
                .map((c) => ({ label: config.classLabel(c), value: c }))}
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
                  content: `You are about to promote ${confirmCount} student${confirmCount > 1 ? "s" : ""} from ${config.classLabel(fromClass!)} to ${config.classLabel(toClass!)}. This action cannot be undone. Continue?`,
                  okText: "Promote",
                  okType: "primary",
                  onOk: () => promoteMutation.mutate(),
                })
              }
            >
              {config.promoteButtonLabel(confirmCount)}
            </Button>
          </div>
        </Space>
      </Card>

      {fromClass !== undefined && (
        <>
          {students.length === 0 && !isLoading ? (
            <Alert
              type="info"
              message={`No active students found in ${config.classLabel(fromClass)}.`}
            />
          ) : (
            <Card title={`Students in ${config.classLabel(fromClass)} (${students.length})`}>
              <Table
                columns={columns}
                dataSource={students}
                rowKey="id"
                loading={isLoading}
                rowSelection={
                  config.hasRowSelection
                    ? {
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys as string[]),
                      }
                    : undefined
                }
                pagination={{ pageSize: 20 }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
