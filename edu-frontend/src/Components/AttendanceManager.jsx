import { useState, useEffect } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import { sessionApi } from '../api/sessionApi';
import { studentApi } from '../api/studentApi';
import { useToast } from '../context/ToastContext';

export default function AttendanceManager({ classId, initialSessionId = null }) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState('session'); // 'session' | 'matrix'
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // studentId -> { status, note }
  const [allClassAttendances, setAllClassAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Tải dữ liệu ban đầu: danh sách buổi học và học sinh
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sessionsData, studentsData] = await Promise.all([
        sessionApi.getByClass(classId),
        studentApi.getByClass(classId)
      ]);

      sessionsData.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setSessions(sessionsData);
      setStudents(studentsData);

      if (sessionsData.length > 0) {
        const defaultSessionId = initialSessionId && sessionsData.some(s => s.id === initialSessionId)
          ? initialSessionId
          : sessionsData[0].id;
        setSelectedSessionId(defaultSessionId);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu điểm danh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [classId]);

  // Tải điểm danh khi đổi buổi học
  const fetchSessionAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      const records = await attendanceApi.getBySession(sessionId);
      const map = {};
      records.forEach(rec => {
        map[rec.studentId] = {
          status: rec.status,
          note: rec.note || ''
        };
      });
      setAttendanceRecords(map);
    } catch (error) {
      console.error('Lỗi tải điểm danh buổi học:', error);
    }
  };

  useEffect(() => {
    if (selectedSessionId && viewMode === 'session') {
      fetchSessionAttendance(selectedSessionId);
    }
  }, [selectedSessionId, viewMode]);

  // Tải toàn bộ điểm danh khi chuyển sang chế độ Ma trận
  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getByClass(classId);
      setAllClassAttendances(data);
    } catch (error) {
      console.error('Lỗi tải ma trận điểm danh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'matrix') {
      fetchMatrixData();
    }
  }, [viewMode]);

  // Đổi trạng thái của 1 học sinh trong state
  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: status
      }
    }));
  };

  // Đổi ghi chú
  const handleNoteChange = (studentId, note) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note: note
      }
    }));
  };

  // Nút nhanh: Tất cả có mặt
  const markAllPresent = () => {
    const updated = { ...attendanceRecords };
    students.forEach(st => {
      updated[st.studentId] = {
        ...updated[st.studentId],
        status: 'PRESENT'
      };
    });
    setAttendanceRecords(updated);
  };

  // Lưu điểm danh buổi học hiện tại
  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const items = students.map(st => {
        const rec = attendanceRecords[st.studentId];
        return {
          studentId: st.studentId,
          status: rec?.status || 'PRESENT',
          note: rec?.note || ''
        };
      });

      await attendanceApi.batchMark(selectedSessionId, items);
      setSaveMessage('✓ Đã lưu điểm danh thành công!');
      toast.success('Đã lưu điểm danh thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      toast.error('Lỗi lưu điểm danh: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 py-6">Đang tải dữ liệu điểm danh...</div>;

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Chưa có buổi học nào</h4>
        <p className="text-sm text-gray-500 mb-4">Bạn cần tạo buổi học trước khi có thể điểm danh học sinh.</p>
      </div>
    );
  }

  // Thống kê nhanh buổi đang chọn
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let onlineCount = 0;
  let unrecordedCount = 0;

  students.forEach(st => {
    const s = attendanceRecords[st.studentId]?.status;
    if (s === 'PRESENT') presentCount++;
    else if (s === 'ONLINE') onlineCount++;
    else if (s === 'ABSENT') absentCount++;
    else if (s === 'LATE') lateCount++;
    else unrecordedCount++;
  });

  return (
    <div>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Quản Lý Điểm Danh</h3>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button 
            onClick={() => setViewMode('session')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewMode === 'session' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}>
            Điểm danh theo buổi
          </button>
          <button 
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${viewMode === 'matrix' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}>
            Ma trận chuyên cần
          </button>
        </div>
      </div>

      {viewMode === 'session' ? (
        /* CHẾ ĐỘ 1: ĐIỂM DANH THEO BUỔI */
        <div className="space-y-6">
          {/* Thanh chọn buổi học và thao tác nhanh */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Chọn Buổi học:</label>
              <select 
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-80">
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.topic || 'Buổi học'} ({s.startTime ? new Date(s.startTime).toLocaleDateString('vi-VN') : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={markAllPresent}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition cursor-pointer">
                Tất cả có mặt
              </button>
              <button 
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition cursor-pointer shadow-xs">
                {saving ? 'Đang lưu...' : 'Lưu Điểm Danh'}
              </button>
            </div>
          </div>

          {/* Thông báo đã lưu */}
          {saveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md animate-fade-in">
              {saveMessage}
            </div>
          )}

          {/* Thẻ thống kê nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-700">{presentCount}</div>
              <div className="text-xs font-semibold text-emerald-600 uppercase mt-0.5">Có mặt</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-sky-700">{onlineCount}</div>
              <div className="text-xs font-semibold text-sky-600 uppercase mt-0.5">Học Online</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-700">{lateCount}</div>
              <div className="text-xs font-semibold text-amber-600 uppercase mt-0.5">Đi muộn</div>
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{absentCount}</div>
              <div className="text-xs font-semibold text-red-600 uppercase mt-0.5">Vắng mặt</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">{unrecordedCount}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase mt-0.5">Chưa ghi nhận</div>
            </div>
          </div>

          {/* Bảng danh sách học sinh điểm danh */}
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-xs">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Mã HV</th>
                  <th className="px-5 py-3.5">Học sinh</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái điểm danh</th>
                  <th className="px-5 py-3.5">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((st) => {
                  const currentRecord = attendanceRecords[st.studentId] || {};
                  const status = currentRecord.status;

                  return (
                    <tr key={st.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3.5 font-medium text-gray-900">#{st.studentId}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800">{st.studentName}</div>
                        <div className="text-xs text-gray-500">{st.studentEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center items-center gap-1.5 flex-wrap">
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'PRESENT')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border ${status === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                            Có mặt
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'ONLINE')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border ${status === 'ONLINE' ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white text-gray-700 border-gray-300 hover:bg-sky-50 hover:text-sky-700'}`}>
                            Học Online
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'LATE')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border ${status === 'LATE' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:text-amber-700'}`}>
                            Đi muộn
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleStatusChange(st.studentId, 'ABSENT')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border ${status === 'ABSENT' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:text-red-700'}`}>
                            Vắng mặt
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <input 
                          type="text"
                          value={currentRecord.note || ''}
                          onChange={(e) => handleNoteChange(st.studentId, e.target.value)}
                          placeholder="Nhập ghi chú (VD: có phép, muộn 15p)..."
                          className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-gray-500">
                      Lớp học chưa có học sinh nào để điểm danh.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ 2: MA TRẬN CHUYÊN CẦN */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 pb-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Có mặt (P)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> Học Online (O)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Đi muộn (L)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Vắng (A)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block"></span> Chưa ghi nhận (—)</span>
          </div>

          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-xs">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 border-r border-gray-200 sticky left-0 bg-gray-50 z-10 whitespace-nowrap">Học sinh</th>
                  {sessions.map((s, idx) => (
                    <th key={s.id} className="px-3 py-3 text-center border-r border-gray-200 whitespace-nowrap min-w-[70px]" title={s.topic}>
                      B{idx + 1}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center border-r border-gray-200 whitespace-nowrap">Tổng có mặt</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Tỉ lệ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((st) => {
                  let studentPresent = 0;
                  return (
                    <tr key={st.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 border-r border-gray-200 font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap">
                        {st.studentName}
                      </td>
                      {sessions.map((s) => {
                        const rec = allClassAttendances.find(
                          a => a.studentId === st.studentId && a.sessionId === s.id
                        );
                        const status = rec?.status;
                        if (status === 'PRESENT' || status === 'ONLINE' || status === 'LATE') studentPresent++;

                        return (
                          <td key={s.id} className="px-2 py-2 text-center border-r border-gray-200">
                            {status === 'PRESENT' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-bold" title="Có mặt">
                                P
                              </span>
                            )}
                            {status === 'ONLINE' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-sky-100 text-sky-800 font-bold" title={`Học Online: ${rec?.note || ''}`}>
                                O
                              </span>
                            )}
                            {status === 'LATE' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-800 font-bold" title={`Đi muộn: ${rec?.note || ''}`}>
                                L
                              </span>
                            )}
                            {status === 'ABSENT' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-800 font-bold" title={`Vắng: ${rec?.note || ''}`}>
                                A
                              </span>
                            )}
                            {!status && (
                              <span className="text-gray-300 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold border-r border-gray-200 text-gray-700">
                        {studentPresent} / {sessions.length}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {sessions.length > 0 ? (
                          (() => {
                            const rate = Math.round((studentPresent / sessions.length) * 100);
                            const color = rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600';
                            return <span className={color}>{rate}%</span>;
                          })()
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
