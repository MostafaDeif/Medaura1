"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";

const statusColors: any = {
  مكتملة: "bg-green-100 text-green-600",
  قادمة: "bg-purple-100 text-purple-600",
  "...جارية الأن": "bg-blue-100 text-blue-600",
};

export default function TodayAppointmentsTaple() {
  const router = useRouter();

  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = 3;

  useEffect(() => {
    const getBookings = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          "http://localhost:3001/api/book/my-bookings",
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        console.log("API RESULT => ", result);

        if (!response.ok) {
          console.log("API ERROR => ", result);
          setData([]);
          return;
        }

        if (!result?.bookings || !Array.isArray(result.bookings)) {
          setData([]);
          return;
        }

        const formattedData = result.bookings.map((item: any) => ({
          id: item.booking_id,

          name: item.patient_name || "Unknown",

          email: item.patient_phone || "No phone",

          age: "--",

          status:
            item.status === "confirmed"
              ? "مكتملة"
              : item.status === "pending"
                ? "قادمة"
                : "...جارية الأن",

          time: `${item.booking_from} - ${item.booking_to}`,

          type: "كشف جديد",

          // img: "https://i.pravatar.cc/40?img=3",
        }));

        console.log("FORMATTED => ", formattedData);

        setData(formattedData);
      } catch (error) {
        console.log("FETCH ERROR => ", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    getBookings();
  }, []);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginated = data.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getPages = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 2) {
      return [1, 2, 3, ...(totalPages > 3 ? ["..."] : [])];
    }

    if (page >= totalPages - 1) {
      return [
        ...(totalPages > 3 ? ["..."] : []),
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return ["...", page - 1, page, page + 1, "..."];
  };

  return (
    <div className="bg-(--card-bg) rounded-2xl flex flex-col gap-6 border border-(--card-border) p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex justify-center items-end flex-col gap-3">
          <h3 className="font-bold text-2xl text-(--text-primary)">
            قائمة المواعيد اليوم
          </h3>

          <span className="text-md text-(--text-secondary)">
            عرض تفصيلي لجميع المراجعين المسجلين
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-(--text-secondary)">
          جاري التحميل...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-(--text-secondary)">
          لا يوجد حجوزات
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead className="text-(--text-primary) text-xl">
              <tr className="text-center">
                <th>نوع الزيارة</th>
                <th>الحالة</th>
                <th>العمر</th>
                <th>الوقت</th>
                <th className="pb-3 text-right">المريض</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((p, i) => (
                <tr
                  key={i}
                  className="text-(--text-primary) hover:bg-(--semi-card-bg) transition text-center w-full cursor-pointer"
                  onClick={() => router.push(`/patients/${p.id}`)}
                >
                  <td>
                    <span className="px-2 py-1 text-xs rounded-md bg-[#E7EDF3] text-[#001A6E]">
                      {p.type}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-md ${statusColors[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td>{p.age}</td>

                  <td>{p.time}</td>

                  <td className="py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="text-right">
                        <p className="font-medium">{p.name}</p>

                        <p className="text-xs text-(--text-secondary)">
                          {p.email}
                        </p>
                      </div>

                      {/* <img
                        src={p.img}
                        className="w-9 h-9 rounded-full object-cover"
                        alt="patient"
                      /> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="cursor-pointer text-2xl flex items-center justify-center border border-(--input-border) rounded-md p-1 hover:bg-(--semi-card-bg) transition"
              >
                <ChevronLeft size={19} />
              </button>

              {getPages().map((p, i) => (
                <button
                  key={i}
                  onClick={() => typeof p === "number" && setPage(p)}
                  disabled={p === "..."}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    p === page
                      ? "bg-[#1F2B6C] text-white"
                      : p === "..."
                        ? "cursor-default text-gray-400"
                        : "border border-(--input-border) hover:bg-(--semi-card-bg)"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() =>
                  setPage((p) => Math.min(p + 1, totalPages))
                }
                className="cursor-pointer text-2xl flex items-center justify-center border border-(--input-border) rounded-md p-1 hover:bg-(--semi-card-bg) transition"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <p className="text-(--text-secondary)">
              عرض {page} - {totalPages} من أصل {data.length} مريض
            </p>
          </div>
        </>
      )}
    </div>
  );
}