import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Select,
  Space,
  message,
  Popconfirm,
  DatePicker,
  Tag,
  Switch,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { teacherAttendanceService } from "../../../services/teacherAttendanceService";
import type { TeacherAttendance, FilterAttendanceDto } from "../../../services/teacherAttendanceService";
import { teachersService } from "../../../services/teachersService";
import type { Teacher } from "../../../services/teachersService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

export default function TeacherAttendanceList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [attendanceMode, setAttendanceMode] = useState<
    "simplified" | "detailed"
  >("simplified");
  const [filters, setFilters] = useState<FilterAttendanceDto>({});

  const { data: teachersData } = useQuery({
    queryKey: ["uac", "teachers"],
    queryFn: () => teachersService.getAll("uac", undefined, 1, 1000),
  });

  const teachers = teachersData?.data?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["uac", "teacher-attendance", filters],
    queryFn: () => teacherAttendanceService.getAll("uac", filters),
  });

  const attendances: TeacherAttendance[] = data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherAttendanceService.delete("uac", id),
    onSuccess: () => {
      message.success("Attendance record deleted");
      queryClient.invalidateQueries({ queryKey: ["uac", "teacher-attendance"] });
    },
    onError: () => message.error("Failed to delete record"),
  });

  const columns: ColumnsType<TeacherAttendance> = [
    {
      title: "Teacher",
      key: "teacher",
      render: (_: unknown, record: TeacherAttendance) => (
        <div>
          <strong>{record.teacher?.name || "Unknown"}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.teacher?.paymentType === "lecture_based"
              ? "Lecture Based"
              : "Fixed"}
          </div>
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "attendanceDate",
      key: "attendanceDate",
      width: 120,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Lectures",
      dataIndex: "lecturesTaken",
      key: "lecturesTaken",
      width: 100,
      render: (count: number) => (
        <Tag color="blue">
          {count} lecture{count > 1 ? "s" : ""}
        </Tag>
      ),
    },
    {
      title: "Class",
      dataIndex: "class",
      key: "class",
      width: 80,
      render: (cls: number | undefined) => cls || "-",
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (subject: string | undefined) => subject || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: TeacherAttendance) => (
        <Popconfirm
          title="Delete this attendance record?"
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}
      >
        <Space>
          <Select
            placeholder="Filter by Teacher"
            style={{ width: 200 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, teacherId: value || undefined }))
            }
            allowClear
            showSearch
            options={teachers.map((t: Teacher) => ({
              value: t.id,
              label: t.name,
            }))}
            filterOption={(input, option) =>
              ((option?.label as string) || "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
          <DatePicker.RangePicker
            onChange={(dates) =>
              setFilters((prev) => ({
                ...prev,
                startDate: dates?.[0]?.toISOString(),
                endDate: dates?.[1]?.toISOString(),
              }))
            }
            format="DD/MM/YYYY"
          />
        </Space>
        <Space>
          <span style={{ fontSize: 13, color: "#666" }}>
            {attendanceMode === "simplified" ? "Simplified" : "Detailed"} Mode
          </span>
          <Switch
            checked={attendanceMode === "detailed"}
            onChange={(checked) =>
              setAttendanceMode(checked ? "detailed" : "simplified")
            }
            checkedChildren="Detailed"
            unCheckedChildren="Simple"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              navigate(`/uac/teacher-attendance/add?mode=${attendanceMode}`)
            }
          >
            Record Attendance
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={attendances}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} records`,
        }}
      />
    </div>
  );
}
