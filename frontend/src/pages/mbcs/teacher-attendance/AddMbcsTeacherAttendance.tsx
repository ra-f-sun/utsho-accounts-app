import {
  Form,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Button,
  Card,
  Row,
  Col,
  message,
  Alert,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mbcsTeacherAttendanceService } from "../../../services/mbcsTeacherAttendanceService";
import type { CreateMbcsAttendanceDto } from "../../../services/mbcsTeacherAttendanceService";
import { mbcsTeachersService } from "../../../services/mbcsTeachersService";

export default function AddMbcsTeacherAttendance() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "simplified";

  const { data: teachersData } = useQuery({
    queryKey: ["mbcs-teachers"],
    queryFn: () => mbcsTeachersService.getAll(undefined, 1, 1000),
  });

  const teachers = teachersData?.data?.data || [];
  const lectureBased = teachers.filter(
    (t: any) => t.paymentType === "lecture_based",
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateMbcsAttendanceDto) =>
      mbcsTeacherAttendanceService.create(data),
    onSuccess: () => {
      message.success("Attendance recorded successfully");
      queryClient.invalidateQueries({
        queryKey: ["mbcs-teacher-attendance"],
      });
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to record attendance",
      );
    },
  });

  const summaryMutation = useMutation({
    mutationFn: (data: {
      teacherId: string;
      month: string;
      totalLectures: number;
    }) => mbcsTeacherAttendanceService.createMonthlySummary(data),
    onSuccess: () => {
      message.success("Monthly attendance recorded successfully");
      queryClient.invalidateQueries({
        queryKey: ["mbcs-teacher-attendance"],
      });
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to record attendance",
      );
    },
  });

  const onFinish = (values: any) => {
    if (mode === "simplified") {
      summaryMutation.mutate({
        teacherId: values.teacherId,
        month: values.month.format("YYYY-MM"),
        totalLectures: values.totalLectures,
      });
    } else {
      const data: CreateMbcsAttendanceDto = {
        teacherId: values.teacherId,
        attendanceDate: values.attendanceDate.toISOString(),
        lecturesTaken: values.lecturesTaken,
        class: values.class,
        subject: values.subject,
      };
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || summaryMutation.isPending;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2>Record Teacher Attendance (MBCS)</h2>

      <Alert
        message={
          mode === "simplified"
            ? "Simplified Mode — Enter total lectures for the entire month"
            : "Detailed Mode — Record individual lecture attendance"
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Attendance Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Select Teacher"
                name="teacherId"
                rules={[{ required: true, message: "Please select a teacher" }]}
              >
                <Select
                  placeholder="Search teacher"
                  showSearch
                  options={lectureBased.map((t: any) => ({
                    value: t.id,
                    label: `${t.name} (Lecture Based — ৳${t.perLectureRate}/lecture)`,
                  }))}
                  filterOption={(input, option) =>
                    ((option?.label as string) || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            {mode === "simplified" ? (
              <>
                <Col span={12}>
                  <Form.Item
                    label="Month"
                    name="month"
                    rules={[{ required: true, message: "Please select month" }]}
                  >
                    <DatePicker
                      picker="month"
                      style={{ width: "100%" }}
                      format="MMMM YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Total Lectures in Month"
                    name="totalLectures"
                    rules={[
                      {
                        required: true,
                        message: "Please enter total lectures",
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: "100%" }}
                      placeholder="Total lectures taken"
                    />
                  </Form.Item>
                </Col>
              </>
            ) : (
              <>
                <Col span={12}>
                  <Form.Item
                    label="Attendance Date"
                    name="attendanceDate"
                    rules={[{ required: true, message: "Please select date" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Lectures Taken"
                    name="lecturesTaken"
                    rules={[
                      {
                        required: true,
                        message: "Please enter number of lectures",
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={10}
                      style={{ width: "100%" }}
                      placeholder="Number of lectures"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Class" name="class">
                    <Select placeholder="Which class (optional)" allowClear>
                      {[6, 7, 8, 9, 10].map((cls) => (
                        <Select.Option key={cls} value={cls}>
                          Class {cls}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Subject" name="subject">
                    <Input placeholder="Subject taught (optional)" />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            Record Attendance
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/mbcs/teacher-attendance")}
            size="large"
          >
            Back to List
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
