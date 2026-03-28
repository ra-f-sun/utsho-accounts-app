import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Select, Space, App, Popconfirm, Tag } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  paymentsService,
  UAC_PAYMENT_TYPES,
  MBCS_PAYMENT_TYPES,
} from "../../../services/paymentsService";
import type { Payment, FilterPaymentDto } from "../../../services/paymentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import QueryError from "../../../components/QueryError";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Option } = Select;

type OrgType = "uac" | "mbcs";

const METHOD_COLORS: Record<string, string> = {
  cash: "green",
  bkash: "pink",
  nagad: "orange",
  bank_transfer: "blue",
};

const ORG_CONFIG: Record<
  OrgType,
  {
    paymentTypes: { value: string; label: string }[];
    typeColors: Record<string, string>;
    studentSubLabel: (s: Payment["student"]) => string;
  }
> = {
  uac: {
    paymentTypes: UAC_PAYMENT_TYPES,
    typeColors: {
      tuition: "blue",
      admission: "green",
      readmission: "cyan",
      exam: "orange",
      sheet: "purple",
      session_charge: "magenta",
      study_materials: "geekblue",
      study_tour: "lime",
      other: "default",
    },
    studentSubLabel: (s) => `Class ${s?.class}`,
  },
  mbcs: {
    paymentTypes: MBCS_PAYMENT_TYPES,
    typeColors: {
      tuition: "blue",
      late_fee: "volcano",
      admission: "green",
      readmission: "cyan",
      exam: "orange",
      session_charge: "magenta",
      study_materials: "geekblue",
      study_tour: "lime",
      stationary: "purple",
      other: "default",
    },
    studentSubLabel: (s) =>
      `${MBCS_CLASS_MAP[s?.class ?? -1] ?? `Class ${s?.class}`}${s?.shift ? ` · ${s.shift}` : ""}`,
  },
};

interface GroupedPayment {
  invoiceNumber: string;
  student: Payment["student"];
  paymentTypes: string[];
  totalAmount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  ids: string[];
}

export default function PaymentsList({ org }: { org: OrgType }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterPaymentDto>({});
  const config = ORG_CONFIG[org];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [org, "payments", filters],
    queryFn: () => paymentsService.getAll(org, filters, 1, 1000),
  });

  const groupedPayments = useMemo((): GroupedPayment[] => {
    const payments: Payment[] = data?.data?.data || [];
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }
    return Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        invoiceNumber: first.invoiceNumber,
        student: first.student,
        paymentTypes: group.map((p) => p.paymentType).filter((t): t is string => t != null),
        totalAmount:
          first.officePaid ??
          first.officeGrandTotal ??
          group.reduce((s, p) => s + p.amount, 0),
        paymentMethod: first.paymentMethod,
        paymentMonth: first.paymentMonth,
        paymentDate: first.paymentDate,
        ids: group.map((p) => p.id),
      };
    });
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => paymentsService.delete(org, id))),
    onSuccess: () => {
      message.success("Payment deleted successfully");
      queryClient.invalidateQueries({ queryKey: [org, "payments"] });
    },
    onError: () => message.error("Failed to delete payment"),
  });

  const columns: ColumnsType<GroupedPayment> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: GroupedPayment) => (
        <div>
          <div><strong>{record.student?.name}</strong></div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {config.studentSubLabel(record.student)}
          </div>
        </div>
      ),
    },
    {
      title: "Payment Types",
      key: "paymentTypes",
      render: (_: unknown, record: GroupedPayment) => (
        <Space size={[4, 4]} wrap>
          {record.paymentTypes.map((type, i) => (
            <Tag key={i} color={config.typeColors[type] || "default"}>
              {type.replace(/_/g, " ").toUpperCase()}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Total",
      key: "totalAmount",
      width: 120,
      render: (_: unknown, record: GroupedPayment) => (
        <strong style={{ color: "#2e7d32" }}>
          ৳{record.totalAmount.toLocaleString()}
        </strong>
      ),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (method: string) => (
        <Tag color={METHOD_COLORS[method] || "default"}>
          {method.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 120,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: GroupedPayment) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate(`/${org}/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)
            }
          />
          <Popconfirm
            title="Delete all payments in this invoice?"
            onConfirm={() => deleteMutation.mutate(record.ids)}
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

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Space>
          <Select
            placeholder="Payment Type"
            style={{ width: 160 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, paymentType: value || undefined }))
            }
            allowClear
          >
            {config.paymentTypes.map((pt) => (
              <Option key={pt.value} value={pt.value}>
                {pt.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Payment Method"
            style={{ width: 150 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, paymentMethod: value || undefined }))
            }
            allowClear
          >
            <Option value="cash">Cash</Option>
            <Option value="bkash">bKash</Option>
            <Option value="nagad">Nagad</Option>
            <Option value="bank_transfer">Bank Transfer</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/${org}/payments/record`)}
        >
          Record Payment
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={groupedPayments}
        rowKey="invoiceNumber"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} invoices`,
        }}
      />
    </div>
  );
}
