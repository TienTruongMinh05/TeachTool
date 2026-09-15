package com.edumanager.api.service;

import com.edumanager.api.entity.ActivityTemplate;
import com.edumanager.api.repository.ActivityTemplateRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityTemplateService {
    private final ActivityTemplateRepository repository;
    private final DataSource dataSource;

    @PostConstruct
    public void initDefaultActivities() {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE activity_templates ALTER COLUMN description TYPE TEXT");
        } catch (Exception e) {
            System.err.println("Note on alter table activity_templates: " + e.getMessage());
        }

        List<ActivityTemplate> defaults = List.of(
            // --- NHÓM 1: TESOL - PHÁT TRIỂN GIAO TIẾP & NÓI (CLT) ---
            ActivityTemplate.builder()
                .name("Find Someone Who... (Tìm người phù hợp - TESOL)")
                .description("Mục đích: Rèn luyện phản xạ giao tiếp và kỹ năng đặt câu hỏi nghi vấn (Yes/No questions).\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên phát cho mỗi học sinh một phiếu khảo sát với các câu khẳng định (VD: Find someone who has been to Da Lat, Find someone who can play guitar...).\n" +
                             "2. Học sinh đứng dậy di chuyển khắp lớp, đặt câu hỏi cho các bạn.\n" +
                             "3. Khi tìm được bạn trả lời 'Yes', học sinh đặt thêm 1 câu hỏi chi tiết (Follow-up) và ghi tên bạn vào phiếu.\n" +
                             "Thời lượng: 10 - 15 phút. Dụng cụ: Giấy in phiếu câu hỏi.")
                .build(),

            ActivityTemplate.builder()
                .name("Information Gap (Khoảng trống thông tin - TESOL)")
                .description("Mục đích: Thúc đẩy giao tiếp thực tế (Authentic Communication) để trao đổi dữ liệu còn thiếu.\n" +
                             "Cách tổ chức:\n" +
                             "1. Chia học sinh theo cặp (Bạn A và Bạn B).\n" +
                             "2. Mỗi bạn nhận một nửa thông tin so le nhau (thời khóa biểu, bản đồ chỉ đường, lịch trình du lịch, thực đơn).\n" +
                             "3. Tuyệt đối không nhìn bài nhau, chỉ dùng tiếng Anh để hỏi và trả lời nhằm điền kín khoảng trống thông tin.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Phiếu bài tập A/B.")
                .build(),

            ActivityTemplate.builder()
                .name("Speed Dating / Carousel Speaking (Vòng tròn đối thoại luân phiên)")
                .description("Mục đích: Tăng tối đa độ lưu loát (Fluency), giảm áp lực nói trước đám đông.\n" +
                             "Cách tổ chức:\n" +
                             "1. Lớp xếp thành 2 vòng tròn đồng tâm (hoặc 2 dãy bàn đối diện nhau).\n" +
                             "2. Giáo viên đưa ra 1 chủ đề hoặc câu hỏi thảo luận.\n" +
                             "3. Mỗi cặp có 1.5 - 2 phút để trao đổi ý kiến.\n" +
                             "4. Khi giáo viên ra hiệu 'Switch!', vòng ngoài dịch chuyển 1 bước sang bạn mới để tiếp tục với chủ đề/câu hỏi tiếp theo.\n" +
                             "Thời lượng: 15 phút. Không cần dụng cụ công nghệ.")
                .build(),

            ActivityTemplate.builder()
                .name("Role-play / Simulation (Đóng vai tình huống đời sống)")
                .description("Mục đích: Ứng dụng ngôn ngữ vào các ngữ cảnh xã hội thực tế.\n" +
                             "Cách tổ chức:\n" +
                             "1. Học sinh đóng vai các nhân vật trong ngữ cảnh cụ thể (gọi món tại nhà hàng, đổi hàng tại siêu thị, phỏng vấn xin việc, khiếu nại khách sạn).\n" +
                             "2. Mỗi bạn nhận thẻ vai (Role card) chứa mục tiêu và nhiệm vụ cần đạt được.\n" +
                             "3. Khuyến khích sử dụng biểu cảm, ngôn ngữ cơ thể và kỹ năng đàm phán giải quyết vấn đề.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Thẻ vai tình huống.")
                .build(),

            ActivityTemplate.builder()
                .name("Alibi / The Detective Game (Trò chơi Thám tử & Ngoại phạm)")
                .description("Mục đích: Luyện thì Quá khứ tiếp diễn (Past Continuous) và Quá khứ đơn; phát triển tư duy phản biện.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giả định xảy ra 1 vụ án lúc 8h tối qua. 2 học sinh đóng vai 'nghi phạm' ra ngoài hành lang trong 3 phút để thống nhất mọi chi tiết ngoại phạm.\n" +
                             "2. Cả lớp đóng vai các thám tử cảnh sát, thẩm vấn riêng từng nghi phạm với các câu hỏi chi tiết về thời gian, địa điểm, trang phục, hành động.\n" +
                             "3. Cả lớp so sánh lời khai để tìm ra điểm mâu thuẫn bất nhất.\n" +
                             "Thời lượng: 20 - 25 phút. Không cần công nghệ.")
                .build(),

            // --- NHÓM 2: TESOL - TỪ VỰNG, NGỮ PHÁP & PHÁT ÂM ---
            ActivityTemplate.builder()
                .name("Hot Seat / Back to the Board (Ghế nóng đoán từ)")
                .description("Mục đích: Ôn tập định nghĩa từ vựng, từ đồng nghĩa/trái nghĩa, diễn giải bằng tiếng Anh.\n" +
                             "Cách tổ chức:\n" +
                             "1. Một học sinh ngồi quay lưng về phía bảng (Ghế nóng).\n" +
                             "2. Giáo viên viết 1 từ vựng/khái niệm lên bảng.\n" +
                             "3. Cả lớp hoặc đồng đội dùng tiếng Anh miêu tả định nghĩa, đặt câu ví dụ, dùng từ đồng nghĩa/trái nghĩa (không được nói từ trên bảng, không dùng tiếng mẹ đẻ).\n" +
                             "4. Bạn ngồi ghế nóng đoán đúng từ trong vòng 60 giây để ghi điểm.\n" +
                             "Thời lượng: 10 phút. Dụng cụ: Bảng và phấn/bút lông.")
                .build(),

            ActivityTemplate.builder()
                .name("Running Dictation (Đọc và Chép chính tả tiếp sức)")
                .description("Mục đích: Tích hợp toàn diện 4 kỹ năng Nghe - Nói - Đọc - Viết và rèn luyện thể chất năng động.\n" +
                             "Cách tổ chức:\n" +
                             "1. Dán các mẩu truyện ngắn hoặc đoạn văn ngữ pháp ở các góc phòng hoặc hành lang.\n" +
                             "2. Chia nhóm đôi: 1 bạn làm 'Người chạy' (Runner) và 1 bạn làm 'Người chép' (Writer).\n" +
                             "3. Runner chạy đến đọc đoạn văn, ghi nhớ trong đầu, chạy về đọc lại cho Writer chép chính xác từng từ và dấu câu.\n" +
                             "4. Nhóm nào chép xong trước và đúng chính tả nhiều nhất sẽ chiến thắng.\n" +
                             "Thời lượng: 15 phút. Dụng cụ: Đoạn văn in sẵn dán tường.")
                .build(),

            ActivityTemplate.builder()
                .name("Taboo / Don't Say It! (Từ khóa và Từ cấm kỵ)")
                .description("Mục đích: Phát triển kỹ năng diễn đạt vòng (circumlocution) - cốt lõi để nói trôi chảy khi quên từ vựng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Mỗi thẻ gồm 1 Từ khóa chính ở trên và 3 - 4 Từ cấm kỵ (Taboo words) ở dưới.\n" +
                             "2. Người chơi phải miêu tả từ khóa chính để đồng đội đoán được mà tuyệt đối không được phát âm bất kỳ từ cấm nào.\n" +
                             "3. Mỗi lượt đoán trong 60 giây, đội nào đoán được nhiều từ hơn sẽ giành điểm.\n" +
                             "Thời lượng: 10 - 15 phút. Dụng cụ: Thẻ từ giấy.")
                .build(),

            ActivityTemplate.builder()
                .name("Sentence Auction (Đấu giá câu ngữ pháp)")
                .description("Mục đích: Nhận diện và sửa lỗi sai ngữ pháp thông qua hình thức game đấu giá kịch tính.\n" +
                             "Cách tổ chức:\n" +
                             "1. Mỗi nhóm được cấp 100 điểm ảo. Giáo viên phát danh sách 12 - 15 câu tiếng Anh (gồm cả câu đúng và câu chứa lỗi sai ngữ pháp).\n" +
                             "2. Các nhóm có 5 phút thảo luận để phân tích câu đúng - sai.\n" +
                             "3. Bắt đầu phiên đấu giá từng câu: Đội nào trả giá cao nhất sẽ mua được câu đó.\n" +
                             "4. Tổng kết: Đội nào mua được nhiều câu đúng nhất và còn nhiều điểm nhất sẽ chiến thắng.\n" +
                             "Thời lượng: 20 phút. Dụng cụ: Phiếu danh sách câu.")
                .build(),

            ActivityTemplate.builder()
                .name("Whisper Challenge / Pronunciation Relay (Tam sao thất bản phát âm)")
                .description("Mục đích: Nhận thức sâu sắc về tầm quan trọng của việc phát âm chuẩn xác từng âm vị (Minimal Pairs, Tongue Twisters).\n" +
                             "Cách tổ chức:\n" +
                             "1. Lớp xếp thành các hàng dọc.\n" +
                             "2. Giáo viên đưa mảnh giấy chứa câu luyện phát âm khó hoặc cặp âm dễ nhầm lẫn (/s/ - /ʃ/, /θ/ - /ð/, /p/ - /b/) cho học sinh đầu hàng.\n" +
                             "3. Học sinh thì thầm câu vào tai bạn tiếp theo, truyền dần xuống cuối hàng.\n" +
                             "4. Bạn cuối hàng chạy lên bảng viết lại câu nghe được hoặc đọc to rõ ràng trước lớp.\n" +
                             "Thời lượng: 10 phút. Dụng cụ: Mẩu giấy ghi câu luyện phát âm.")
                .build(),

            // --- NHÓM 3: TESOL - ĐỌC HIỂU & VIẾT HỢP TÁC ---
            ActivityTemplate.builder()
                .name("Jigsaw Reading (Mảnh ghép đọc hiểu chuyên gia)")
                .description("Mục đích: Rèn kỹ năng đọc hiểu chuyên sâu, tóm tắt ý chính và thuyết trình chia sẻ kiến thức.\n" +
                             "Cách tổ chức:\n" +
                             "1. Bài đọc dài được chia thành 4 đoạn (A, B, C, D). Mỗi thành viên trong nhóm 4 người nhận 1 đoạn.\n" +
                             "2. Học sinh tách nhóm để ngồi cùng những bạn đọc chung đoạn văn thành 'Nhóm chuyên gia' để cùng giải nghĩa từ và tóm tắt.\n" +
                             "3. Sau đó, học sinh trở về nhóm ban đầu để giảng lại phần mình phụ trách cho 3 bạn còn lại.\n" +
                             "Thời lượng: 20 - 30 phút. Dụng cụ: Bài đọc chia đoạn A/B/C/D.")
                .build(),

            ActivityTemplate.builder()
                .name("Pass the Story / Chain Writing (Viết câu chuyện tiếp sức)")
                .description("Mục đích: Luyện viết câu theo ngữ cảnh, liên kết ý và phát huy tối đa tính sáng tạo.\n" +
                             "Cách tổ chức:\n" +
                             "1. Mỗi học sinh chuẩn bị một tờ giấy trắng, viết câu mở đầu cho câu chuyện (sử dụng từ vựng/thì ngữ pháp đang học).\n" +
                             "2. Sau 1.5 phút, theo hiệu lệnh giáo viên, học sinh chuyển bài cho bạn bên cạnh.\n" +
                             "3. Bạn nhận bài đọc câu trước và viết tiếp 1 - 2 câu phát triển tình tiết.\n" +
                             "4. Sau 5 - 6 lượt chuyển, tờ giấy quay về người mở đầu để đọc to kết cục câu chuyện trước lớp.\n" +
                             "Thời lượng: 15 phút. Dụng cụ: Giấy và bút.")
                .build(),

            // --- NHÓM 4: KHỞI ĐỘNG, NĂNG LƯỢNG & HOẠT ĐỘNG NGOÀI (NO-TECH / LOW-TECH) ---
            ActivityTemplate.builder()
                .name("Two Truths and One Lie (Hai thật Một giả - Khởi động & Gắn kết)")
                .description("Mục đích: Phá băng khoảng cách (Ice-breaker), tạo sự tự tin và rèn kỹ năng đặt câu hỏi phỏng vấn.\n" +
                             "Cách tổ chức:\n" +
                             "1. Mỗi học sinh viết ra 3 thông tin về bản thân (hoặc 3 sự thật về bài học): 2 điều thật và 1 điều bịa đặt.\n" +
                             "2. Từng bạn đọc 3 câu của mình lên. Cả lớp được quyền đặt các câu hỏi chất vấn để điều tra và bỏ phiếu tìm ra câu nói dối.\n" +
                             "Thời lượng: 10 - 15 phút. Không cần dụng cụ.")
                .build(),

            ActivityTemplate.builder()
                .name("Four Corners (Bốn góc quan điểm - Tranh luận vận động)")
                .description("Mục đích: Khuyến khích học sinh bày tỏ chính kiến và tham gia tranh luận có dẫn chứng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Bốn góc phòng được dán 4 biển: Rất đồng ý, Đồng ý, Không đồng ý, Hoàn toàn phản đối.\n" +
                             "2. Giáo viên đưa ra một nhận định gợi mở hoặc gây tranh cãi liên quan đến bài học.\n" +
                             "3. Học sinh di chuyển về góc thể hiện quan điểm của mình, thảo luận nhanh với bạn cùng góc và cử đại diện tranh luận với góc đối diện.\n" +
                             "Thời lượng: 15 phút. Dụng cụ: 4 tờ giấy dán 4 góc phòng.")
                .build(),

            ActivityTemplate.builder()
                .name("Ball Toss Q&A (Ném bóng phản xạ nhanh)")
                .description("Mục đích: Kích thích sự tập trung, tạo phản xạ trả lời nhanh không do dự và khuấy động năng lượng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Chuẩn bị 1 quả bóng xốp mềm hoặc bóng vải.\n" +
                             "2. Người giữ bóng đặt 1 câu hỏi ôn tập hoặc câu hỏi gợi mở, sau đó tung bóng cho bạn bất kỳ trong lớp.\n" +
                             "3. Bạn bắt được bóng phải trả lời trong vòng 3 - 5 giây, sau đó đặt câu hỏi mới và tung tiếp cho bạn khác.\n" +
                             "Thời lượng: 5 - 10 phút. Dụng cụ: 1 quả bóng mềm.")
                .build(),

            ActivityTemplate.builder()
                .name("Slap the Board / Fly Swatter (Đập bảng phản xạ từ vựng)")
                .description("Mục đích: Ôn tập nhận diện từ vựng, hình ảnh, công thức nhanh chóng và hào hứng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Viết các từ vựng hoặc dán hình ảnh rải rác lên bảng.\n" +
                             "2. Chia lớp thành 2 đội xếp hàng. Đại diện 2 đội đứng trước bảng cầm cây đập ruồi nhựa hoặc dùng tay không.\n" +
                             "3. Giáo viên đọc định nghĩa, từ đồng nghĩa hoặc câu đố. Ai chạy lên đập trúng từ trên bảng trước sẽ mang về điểm cho đội mình.\n" +
                             "Thời lượng: 10 phút. Dụng cụ: Bảng và cây đập nhựa hoặc tay không.")
                .build(),

            ActivityTemplate.builder()
                .name("Fishbowl Debate (Tranh biện bể cá)")
                .description("Mục đích: Rèn luyện khả năng lắng nghe tích cực, tư duy tranh biện văn minh và bình đẳng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Xếp 4 - 5 chiếc ghế ở giữa lớp tạo thành 'Bể cá' (Fishbowl), các học sinh còn lại ngồi xung quanh quan sát.\n" +
                             "2. Chỉ những người ngồi trong bể cá mới được phát biểu tranh luận về chủ đề được giao.\n" +
                             "3. Bất kỳ học sinh nào ở vòng ngoài muốn phát biểu có thể tiến lên vỗ nhẹ vai một bạn trong bể cá để đổi chỗ.\n" +
                             "Thời lượng: 20 - 25 phút. Không cần dụng cụ.")
                .build(),

            ActivityTemplate.builder()
                .name("Stand Up / Sit Down (Đứng lên Ngồi xuống theo mệnh đề)")
                .description("Mục đích: Khởi động nhanh đầu giờ, giải tỏa căng thẳng và vận động thể chất nhẹ nhàng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên đọc nhanh các câu mệnh đề: 'Stand up if you had coffee today', 'Sit down if you slept after 11 PM', 'Stand up if you have a pet'...\n" +
                             "2. Học sinh lắng nghe và thực hiện hành động tương ứng với bản thân.\n" +
                             "Thời lượng: 3 - 5 phút. Không cần dụng cụ.")
                .build(),

            ActivityTemplate.builder()
                .name("Mystery Box / 20 Questions (Hộp bí mật & 20 câu hỏi Yes/No)")
                .description("Mục đích: Rèn luyện tư duy phân loại logic và kỹ năng đặt câu hỏi đóng (Yes/No questions).\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên giấu một đồ vật thật vào một chiếc hộp kín hoặc túi vải.\n" +
                             "2. Cả lớp được đặt tối đa 20 câu hỏi Yes/No (VD: Is it made of plastic? Is it bigger than a book? Can we eat it?).\n" +
                             "3. Học sinh xâu chuỗi manh mối để đoán chính xác đồ vật trước khi chạm mốc 20 câu.\n" +
                             "Thời lượng: 10 phút. Dụng cụ: Chiếc hộp kín và một đồ vật thật.")
                .build(),

            ActivityTemplate.builder()
                .name("Think - Pair - Share (Suy nghĩ độc lập - Ghép đôi - Chia sẻ toàn lớp)")
                .description("Mục đích: Kỹ thuật dạy học tích cực đảm bảo 100% học sinh đều tham gia tư duy, không ai đứng ngoài lề.\n" +
                             "Cách tổ chức:\n" +
                             "1. Bước 1 (Think - 1 phút): Giáo viên đặt câu hỏi mở, từng cá nhân tự suy nghĩ và ghi chú câu trả lời của mình.\n" +
                             "2. Bước 2 (Pair - 2 phút): Học sinh quay sang bạn ngồi cạnh để so sánh và bổ sung ý kiến cho nhau.\n" +
                             "3. Bước 3 (Share - 3 phút): Đại diện một số cặp chia sẻ câu trả lời hoàn thiện trước toàn lớp.\n" +
                             "Thời lượng: 6 - 8 phút. Không cần dụng cụ.")
                .build(),

            ActivityTemplate.builder()
                .name("Gallery Walk (Triển lãm tranh & Nhận xét vòng quanh)")
                .description("Mục đích: Trưng bày sản phẩm học tập tập thể, rèn luyện kỹ năng nhận xét phản biện mang tính xây dựng.\n" +
                             "Cách tổ chức:\n" +
                             "1. Các nhóm làm bài trên giấy A3/A0 (sơ đồ tư duy, bài luận nhóm, poster dự án) và dán lên tường quanh lớp như phòng triển lãm.\n" +
                             "2. Học sinh cầm bút dạ hoặc giấy ghi chú dán (Post-it) đi vòng quanh tham quan các poster.\n" +
                             "3. Để lại lời nhận xét, câu hỏi chất vấn hoặc dán sticker bình chọn cho poster xuất sắc nhất.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Giấy A3/A0, bút dạ, giấy ghi chú Post-it.")
                .build(),

            ActivityTemplate.builder()
                .name("Vòng xoay may mắn (Wheel of Names / Bốc thăm)")
                .description("Mục đích: Tạo không khí hào hứng ngẫu nhiên, duy trì sự tập trung công bằng trong kiểm tra bài cũ.\n" +
                             "Cách tổ chức:\n" +
                             "1. Dùng vòng xoay giấy thủ công hoặc thẻ số để gọi tên học sinh ngẫu nhiên.\n" +
                             "2. Học sinh được gọi trả lời câu hỏi ôn tập, nhận thử thách tình huống hoặc nhận quà khuyến khích.\n" +
                             "Thời lượng: 5 - 10 phút. Dụng cụ: Thẻ số bốc thăm hoặc vòng xoay giấy.")
                .build()
        );

        // Cập nhật hoặc lưu mới nếu chưa tồn tại
        for (ActivityTemplate act : defaults) {
            java.util.Optional<ActivityTemplate> existingOpt = repository.findByName(act.getName());
            if (existingOpt.isPresent()) {
                ActivityTemplate existing = existingOpt.get();
                existing.setDescription(act.getDescription());
                repository.save(existing);
            } else {
                repository.save(act);
            }
        }
    }

    public List<ActivityTemplate> getAllActivities() {
        return repository.findAll();
    }

    public ActivityTemplate createActivity(ActivityTemplate activity) {
        return repository.save(activity);
    }

    public ActivityTemplate updateActivity(Long id, ActivityTemplate updated) {
        ActivityTemplate existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hoạt động có ID: " + id));
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        return repository.save(existing);
    }

    public void deleteActivity(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy hoạt động có ID: " + id);
        }
        repository.deleteById(id);
    }
}
