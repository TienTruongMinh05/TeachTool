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
            stmt.execute("ALTER TABLE activity_templates ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN DEFAULT FALSE");
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
                .build(),

            // --- NHÓM 5: IELTS LISTENING - NGHE HIỂU HỌC THUẬT & BẪY PHÒNG THI ---
            ActivityTemplate.builder()
                .name("IELTS Listening: Signpost Bingo & Distractor Hunt (Thám tử Bắt tín hiệu & Săn bẫy)")
                .description("Mục đích: Rèn phản xạ nhận diện các từ chuyển ý học thuật (Signposting: Turning now to, On the other hand, Moving on...) và bắt thóp các bẫy đổi hướng thông tin gây nhiễu (Distractors: originally, I meant to, actually...) trong IELTS Listening Section 3 & 4.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên phát bảng Bingo (lưới 3x3 hoặc 4x4) gồm các từ chuyển hướng ý và cụm từ cảnh báo bẫy lật kèo.\n" +
                             "2. Bật audio Section 3 hoặc 4 một lần. Học sinh tập trung nghe, mỗi khi phát hiện một từ chuyển ý hoặc một pha 'đổi ý phút chót' của speaker, học sinh gạch ô tương ứng và ghi chép lại đáp án thật sự được sửa lại.\n" +
                             "3. Ai hoàn thành hàng ngang, dọc hoặc chéo đầu tiên hô 'Bingo!' và giải thích bẫy speaker đã giăng ra cho cả lớp nghe.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Bảng Bingo in sẵn, file audio IELTS Listening Section 3/4.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Listening: Split-Script Prediction & Peer Check (Đoán trước khoảng trống & Tiếp sức điền từ)")
                .description("Mục đích: Kích hoạt tối đa năng lực phán đoán trước khi nghe (Prediction) về từ loại, ngữ nghĩa, ngữ pháp (số ít/số nhiều) cho dạng Form / Note / Table Completion trong Section 1 và Section 4.\n" +
                             "Cách tổ chức:\n" +
                             "1. Chia học sinh theo cặp A và B. Phát bài nghe điền từ IELTS Section 1 hoặc Section 4 nhưng các vị trí đục lỗ của bạn A và B so le nhau.\n" +
                             "2. Trước khi nghe (2 - 3 phút), hai bạn không nhìn bài nhau, cùng phân tích ngữ pháp của các chỗ trống (cần danh từ đếm được, ngày tháng, tên riêng hay tính từ) và ghi nháp 2 từ phán đoán khả dĩ.\n" +
                             "3. Bật audio: Mỗi bạn tập trung bắt các chỗ trống của mình. Sau khi nghe xong, hai bạn quay sang hỏi - đáp chéo để kiểm tra chính tả (Spelling), số ít/số nhiều (-s/-es) và cùng hoàn thiện toàn bộ bài nghe.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Phiếu bài tập đục lỗ so le A/B.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Listening: Academic Lecture Mindmapping & Quiz (Tốc ký sơ đồ tư duy Section 4)")
                .description("Mục đích: Nâng cao kỹ năng tốc ký (Note-taking), nhận diện ý chính (Gist) và phân cấp luận điểm trong bài giảng học thuật dài không có quãng nghỉ của IELTS Listening Section 4.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên phát cho mỗi nhóm 3 - 4 bạn một tờ giấy A3 và bút màu. Tuyệt đối không phát đề câu hỏi trước khi nghe.\n" +
                             "2. Bật một bài giảng IELTS Listening Section 4 liên tục. Các thành viên trong nhóm phân công nhau tốc ký theo dạng Mindmap (nhánh chính là các mục lớn, nhánh phụ là số liệu, ví dụ, nguyên nhân - hệ quả).\n" +
                             "3. Sau khi nghe xong, các nhóm có 3 phút hoàn thiện sơ đồ, sau đó giáo viên mới phát 10 câu hỏi IELTS chuẩn. Nhóm nào dựa vào sơ đồ mindmap trả lời đúng nhiều nhất sẽ chiến thắng.\n" +
                             "Thời lượng: 20 - 25 phút. Dụng cụ: Giấy A3, bút màu, file audio Section 4.")
                .build(),

            // --- NHÓM 6: IELTS READING - ĐỌC HIỂU HỌC THUẬT & CHIẾN THUẬT PHÒNG THI ---
            ActivityTemplate.builder()
                .name("IELTS Reading: Paraphrase Hunter & Keyword Swap (Săn lùng Paraphrase & Từ đồng nghĩa)")
                .description("Mục đích: Nâng cao kỹ năng Skimming, Scanning và giải mã bản chất cốt lõi của đề thi IELTS Reading: bẫy hoán đổi từ đồng nghĩa (Paraphrasing).\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên dán các đoạn trích từ bài đọc IELTS Reading xung quanh các góc lớp.\n" +
                             "2. Chia học sinh theo đội 2 - 3 người và phát 'Tập hồ sơ manh mối' chứa các câu hỏi hoặc câu nhận định đã được paraphrase hoàn toàn (dùng từ đồng nghĩa nâng cao hoặc đảo cấu trúc câu).\n" +
                             "3. Các đội di chuyển quanh phòng, quét nhanh (Scanning) để tìm câu văn gốc tương ứng trong bài đọc dán tường, gạch chân cặp từ đồng nghĩa (VD: 'deterioration' = 'worsening', 'curb' = 'limit').\n" +
                             "4. Đội tìm đủ và giải thích đúng sự tương đương ngữ nghĩa nhanh nhất sẽ ghi điểm.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Đoạn văn in khổ lớn dán tường, phiếu manh mối Paraphrase.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Reading: True / False / Not Given Courtroom (Tòa án T/F/NG - Tranh tụng chứng cứ)")
                .description("Mục đích: Xóa bỏ triệt để sự nhầm lẫn kinh điển giữa 'False' (thông tin đối lập/sai sự thật) và 'Not Given' (thông tin không đề cập hoặc suy diễn ngoài văn bản).\n" +
                             "Cách tổ chức:\n" +
                             "1. Lớp chia thành 3 phe đại diện cho 3 quan điểm: Phe True, Phe False, và Phe Not Given. Một học sinh (hoặc giáo viên) đóng vai Thẩm phán.\n" +
                             "2. Giáo viên đưa ra một đoạn văn ngắn IELTS và một nhận định gây tranh cãi.\n" +
                             "3. Mỗi phe có 2 phút hội ý để tìm bằng chứng trong văn bản nhằm bảo vệ phán quyết của mình (chỉ được dùng câu chữ thật trong bài, cấm suy diễn logic đời thường).\n" +
                             "4. Đại diện mỗi phe đứng lên tranh tụng trước Tòa. Thẩm phán gõ búa phân xử xem phe nào đưa ra lập luận chặt chẽ, đúng quy chuẩn chấm thi của Cambridge IELTS.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Đoạn văn ngắn IELTS và bảng nhận định T/F/NG.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Reading: Heading Matchmaker Speed Race (Đua tốc độ Ghép nối Tiêu đề đoạn văn)")
                .description("Mục đích: Rèn luyện kỹ năng đọc bao quát (Skimming), tìm câu chủ đề (Topic sentence) và nhận diện 'tiêu đề bẫy' chỉ chứa chi tiết nhỏ (Detail trap) trong Matching Headings.\n" +
                             "Cách tổ chức:\n" +
                             "1. Cắt rời các đoạn văn của một bài đọc IELTS (đoạn A, B, C, D...) và danh sách các tiêu đề La Mã (i, ii, iii...). \n" +
                             "2. Chia học sinh thành các nhóm 3 - 4 người. Phát cho mỗi nhóm một bộ đoạn văn và tiêu đề bị xáo trộn.\n" +
                             "3. Đặt đồng hồ bấm giờ 7 phút: Nhóm cùng nhau đọc lướt câu đầu và câu cuối của từng đoạn, tìm từ bao hàm ý toàn đoạn để ghép nối với tiêu đề tương ứng.\n" +
                             "4. Kết thúc thời gian, các nhóm đổi bài chấm chéo. Cả lớp cùng mổ xẻ những tiêu đề gây nhiễu và lý do loại trừ.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Bộ thẻ đoạn văn và tiêu đề in cắt rời.")
                .build(),

            // --- NHÓM 7: IELTS WRITING TASK 1 - DIỄN ĐẠT SỐ LIỆU & QUY TRÌNH HỌC THUẬT ---
            ActivityTemplate.builder()
                .name("IELTS Writing Task 1: The Human Graph & Trend Drama (Biểu đồ người sống & Diễn giải xu hướng)")
                .description("Mục đích: Khắc sâu từ vựng mô tả xu hướng (fluctuate, plunge, rocket, plateau, level off) và cấu trúc so sánh dữ liệu trực quan sinh động trong Writing Task 1.\n" +
                             "Cách tổ chức:\n" +
                             "1. Kẻ một trục tọa độ lớn trên sàn lớp (trục hoành là mốc thời gian 1990 - 2020, trục tung là mức độ/phần trăm).\n" +
                             "2. Cử 3 nhóm học sinh, mỗi nhóm đại diện cho một đường trên biểu đồ đường (Line graph) hoặc một quốc gia trong bảng số liệu.\n" +
                             "3. Giáo viên hoặc một bạn học sinh đọc một câu miêu tả học thuật (VD: 'From 2000 to 2010, the figure saw a precipitous drop, followed by a slight recovery'). Nhóm tương ứng phải di chuyển người, đứng lên ngồi xuống để cơ thể tạo thành đúng hình dáng xu hướng đó.\n" +
                             "4. Cả lớp quan sát, nhận xét tính chính xác và cùng nhau viết câu hoàn chỉnh lên bảng với cấu trúc danh từ + động từ và cấu trúc 'There was a...'.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Phấn kẻ sàn hoặc băng dính màu tạo trục tọa độ.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Writing Task 1: The Helicopter Overview Master (Góc nhìn Trực thăng - Săn tìm Đặc điểm nổi bật)")
                .description("Mục đích: Huấn luyện học sinh viết đoạn Tổng quan (Overview) chuẩn band 7.0+ (không đưa số liệu chi tiết, chọn lọc đúng 2 - 3 đặc điểm bao quát nhất của biểu đồ).\n" +
                             "Cách tổ chức:\n" +
                             "1. Chiếu hoặc phát 3 biểu đồ Task 1 khác nhau (Biểu đồ cột, biểu đồ tròn, bảng số liệu).\n" +
                             "2. Học sinh đóng vai 'Phi công trực thăng' bay trên cao nhìn xuống tổng thể bức tranh dữ liệu: Tuyệt đối không nhìn vào từng con số cụ thể.\n" +
                             "3. Trong đúng 90 giây, mỗi học sinh ghi nhanh lên giấy note (Sticky note) 2 đặc điểm nổi bật nhất: Xu hướng lớn nhất (Overall trend) và hạng mục cao nhất/thấp nhất (Key extremes).\n" +
                             "4. Dán sticky notes lên bảng theo từng biểu đồ. Cả lớp bình chọn câu Overview nào gãy gọn, học thuật và dùng từ nối đối lập (while, whereas, in stark contrast) xuất sắc nhất.\n" +
                             "Thời lượng: 15 phút. Dụng cụ: Máy chiếu hoặc bản in biểu đồ Task 1, giấy note dán.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Writing Task 1: Process & Map Relay Walkthrough (Thuyết minh Quy trình & Bản đồ tiếp sức)")
                .description("Mục đích: Thành thạo cách sử dụng thể bị động (Passive voice), các từ nối tuần tự (subsequently, prior to, following this) và từ vựng biến đổi không gian (demolished, transformed into, relocated) trong đề Process & Map.\n" +
                             "Cách tổ chức:\n" +
                             "1. Dán đề bài Map (Quy hoạch thành phố qua 2 giai đoạn) hoặc Process (Quy trình sản xuất cà phê/thủy tinh) lên bảng.\n" +
                             "2. Chia lớp thành các đội 4 bạn xếp hàng tiếp sức.\n" +
                             "3. Theo hiệu lệnh, bạn thứ 1 chạy lên viết câu mở đầu/overview; bạn thứ 2 viết mô tả giai đoạn/khu vực 1; bạn thứ 3 viết giai đoạn 2; bạn thứ 4 viết phần còn lại. Mỗi bạn chỉ có 60 giây và phải dùng ít nhất 1 cấu trúc bị động và 1 liên từ chỉ thứ tự.\n" +
                             "4. Hết giờ, các đội chấm chéo bài của nhau, gạch chân các lỗi thì động từ và lỗi giới từ vị trí.\n" +
                             "Thời lượng: 20 phút. Dụng cụ: Đề bài Map/Process in lớn hoặc máy chiếu, bảng viết.")
                .build(),

            // --- NHÓM 8: IELTS WRITING TASK 2 - TƯ DUY NGHỊ LUẬN & PHÁT TRIỂN LUẬN ĐIỂM ---
            ActivityTemplate.builder()
                .name("IELTS Writing Task 2: The PEEL Idea Tennis (Quần vợt Ý tưởng theo mô hình PEEL)")
                .description("Mục đích: Rèn luyện phản xạ phát triển luận điểm chặt chẽ, đa chiều theo cấu trúc PEEL (Point - Explain - Example - Link), khắc phục triệt để lỗi liệt kê ý sơ sài trong Task 2.\n" +
                             "Cách tổ chức:\n" +
                             "1. Hai bạn học sinh (hoặc 2 đội) đứng đối diện như một trận đấu quần vợt. Giáo viên đưa ra một đề bài Task 2 (VD: 'Should university education be tuition-free for all citizens?').\n" +
                             "2. Đội Giao bóng đưa ra Luận điểm chính (Point - VD: 'Free university education promotes equal social mobility').\n" +
                             "3. Đội Đỡ bóng phải phản xạ tiếp bóng bằng phần Giải thích nguyên nhân sâu xa (Explain - VD: 'This allows talented students from disadvantaged backgrounds to access high-paying careers without crippling debt').\n" +
                             "4. Lượt tiếp theo phải đưa ra Ví dụ thực tế (Example - VD: 'For instance, in countries like Germany...') và Lượt cuối chốt lại câu liên kết chủ đề (Link).\n" +
                             "5. Nhóm nào ngập ngừng quá 5 giây hoặc đưa ý không liên quan sẽ bị trừ điểm giao bóng.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Thẻ câu hỏi đề bài Writing Task 2.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Writing Task 2: Speed Outline Jam & 5-Minute Mindmap (Đua tốc độ Lập dàn bài trong 5 phút)")
                .description("Mục đích: Loại bỏ hội chứng 'cắn bút không biết viết gì' hoặc lạc đề; tối ưu hóa kỹ năng brain-storming và phân bổ luận điểm trong 5 phút đầu giờ thi.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên phát một đề bài Task 2 thuộc dạng câu hỏi phức tạp (Two-part question, Discuss both views or To what extent do you agree/disagree).\n" +
                             "2. Chia học sinh theo cặp. Mỗi cặp nhận một tờ giấy trắng và bút dạ.\n" +
                             "3. Bấm giờ đúng 5 phút: Hai bạn phải phối hợp xác định dạng bài, viết nhanh Thesis statement (quan điểm cốt lõi) và vạch ra 2 luận điểm thân bài (mỗi thân bài gồm 1 Idea chính + 2 ý phát triển giải thích).\n" +
                             "4. Hết 5 phút, học sinh dừng bút ngay lập tức, dán bài lên tường thực hiện Gallery Walk để cả lớp chấm điểm tính thuyết phục và tính khả thi của các luận điểm.\n" +
                             "Thời lượng: 15 phút. Dụng cụ: Giấy A4/A3, bút lông, đồng hồ bấm giờ.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Writing Task 2: Band Descriptors Clinic & Diagnostic (Bác sĩ Chẩn đoán & Nâng cấp Band điểm)")
                .description("Mục đích: Giúp học sinh nắm vững 4 tiêu chí chấm thi chính thức của IELTS (TR, CC, LR, GRA) và tự xây dựng năng lực biên tập, sửa lỗi văn phong cho chính mình.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên chuẩn bị một đoạn văn Task 2 giả định ở mức Band 5.0 - 5.5 (ý còn chung chung, lặp từ, dùng câu đơn nhiều, thiếu từ nối hoặc dùng sai collocations).\n" +
                             "2. Chia lớp thành 4 nhóm 'Bác sĩ chuyên khoa': Nhóm 1 - Task Response, Nhóm 2 - Coherence & Cohesion, Nhóm 3 - Lexical Resource, Nhóm 4 - Grammatical Range & Accuracy.\n" +
                             "3. Mỗi nhóm dùng bút màu riêng 'chẩn đoán bệnh', chỉ ra các điểm yếu theo tiêu chí của nhóm mình và viết lại một phiên bản nâng cấp đạt chuẩn Band 7.0+.\n" +
                             "4. Các nhóm trình bày phương án nâng cấp và ráp nối thành một đoạn văn hoàn thiện trên bảng.\n" +
                             "Thời lượng: 20 - 25 phút. Dụng cụ: Đoạn văn mẫu Band 5.5 in sẵn cho các nhóm, bút dạ màu.")
                .build(),

            // --- NHÓM 9: IELTS SPEAKING - PHẢN XẠ PHÒNG THI & TỰ NHIÊN HÓA NÓI ---
            ActivityTemplate.builder()
                .name("IELTS Speaking: Examiner & Candidate Speed Carousel (Vòng xoay Giám khảo & Thí sinh Part 1 & 3)")
                .description("Mục đích: Tăng tốc độ phản xạ trả lời câu hỏi, rèn luyện sự tự tin khi nói trực tiếp với Examiner và duy trì độ trôi chảy (Fluency) dưới áp lực thời gian.\n" +
                             "Cách tổ chức:\n" +
                             "1. Kê bàn ghế lớp thành 2 hàng đối diện nhau: Một hàng đóng vai Giám khảo (Examiner), một hàng đóng vai Thí sinh (Candidate).\n" +
                             "2. Giáo viên phát cho Examiner danh sách câu hỏi Speaking Part 1 hoặc Part 3 kèm một bảng chấm điểm nhanh (đếm số lần ậm ừ filler words, canh giờ mỗi câu trả lời 20 - 30 giây).\n" +
                             "3. Mỗi lượt đối thoại kéo dài 2.5 phút: Examiner hỏi và lắng nghe, sau đó dành 30 giây nhận xét trực tiếp ưu/nhược điểm cho bạn.\n" +
                             "4. Giáo viên ra hiệu 'Switch!': Hàng Thí sinh bước sang phải 1 vị trí để gặp Giám khảo mới với chủ đề mới. Sau 3 vòng, hai hàng đổi vai trò cho nhau.\n" +
                             "Thời lượng: 20 phút. Dụng cụ: Thẻ câu hỏi Speaking Part 1/3 và phiếu chấm nhận xét.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Speaking: Part 2 Cue Card Challenge & 60s Mindmap (Thử thách Thuyết trình Part 2 & Tốc ký 60 giây)")
                .description("Mục đích: Làm chủ 1 phút chuẩn bị 'vàng' của Speaking Part 2; phát triển kỹ năng kể chuyện (Storytelling) mạch lạc đủ 2 phút mà không bị tắc ý.\n" +
                             "Cách tổ chức:\n" +
                             "1. Giáo viên bốc thăm một đề Cue Card Part 2 (VD: Describe an energetic person you know, Describe a challenge you overcame...). \n" +
                             "2. Học sinh có đúng 60 giây để ghi chép dàn ý theo công thức 5W1H (Who, When, Where, What happened, Why memorable) kết hợp chi tiết cảm giác (nghe thấy gì, cảm xúc thế nào).\n" +
                             "3. Ghép cặp: Bạn A nói liên tục trong 2 phút (bạn B dùng điện thoại bấm giờ, tuyệt đối không ngắt lời). Nếu bạn A dừng lại trước 1 phút 45 giây, bạn B giơ thẻ vàng ra hiệu tiếp tục nói thêm chi tiết.\n" +
                             "4. Hết 2 phút, hai bạn đổi vai với một đề Cue Card mới.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Thẻ đề Cue Card Part 2, đồng hồ bấm giờ trên điện thoại.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Speaking: The Secret Idiom & Collocation Bluff (Gài bẫy Collocation & Paraphrase bí mật)")
                .description("Mục đích: Kích thích học sinh ứng dụng Idiomatic expressions và Collocations nâng cao vào Speaking Part 3 một cách tự nhiên, tránh cảm giác 'học vẹt' hay gượng ép.\n" +
                             "Cách tổ chức:\n" +
                             "1. Mỗi học sinh được phát một mẩu giấy bí mật chứa 2 collocations hoặc idioms học thuật (VD: 'at the expense of', 'a double-edged sword', 'pave the way for', 'take something for granted').\n" +
                             "2. Học sinh thảo luận theo nhóm 3 - 4 người về các chủ đề xã hội Speaking Part 3 (Giáo dục, Môi trường, Công nghệ).\n" +
                             "3. Khi trả lời, người nói phải khéo léo gài 2 cụm từ bí mật vào câu trả lời của mình sao cho câu văn hoàn toàn tự nhiên và hợp ngữ cảnh.\n" +
                             "4. Các bạn còn lại trong nhóm vừa nghe vừa đoán xem cụm từ bí mật là gì. Nếu gài mượt đến mức bạn cùng nhóm không nhận ra sự gượng ép, người nói được cộng điểm tối đa.\n" +
                             "Thời lượng: 15 - 20 phút. Dụng cụ: Thẻ từ vựng bí mật in sẵn.")
                .build(),

            ActivityTemplate.builder()
                .name("IELTS Speaking: Just A Minute (JAM) Fluency Endurance (Một phút không vấp - Sức bền Trôi chảy)")
                .description("Mục đích: Xóa bỏ thói quen ngập ngừng, dịch nhẩm từ tiếng Việt sang tiếng Anh trong đầu; tối đa hóa điểm Fluency & Coherence.\n" +
                             "Cách tổ chức:\n" +
                             "1. Một học sinh đứng trước nhóm hoặc trước lớp nhận một chủ đề ngẫu nhiên từ giáo viên (VD: Social media, Fast fashion, Public holidays, AI technology).\n" +
                             "2. Học sinh phải nói liên tục trong đúng 60 giây và tuân thủ 'Luật 3 Không': Không ngập ngừng quá 3 giây (No Hesitation), Không lặp lại cùng một từ vựng quá 2 lần (No Repetition), Không nói lan man lạc đề (No Deviation).\n" +
                             "3. Các bạn phía dưới đóng vai Trọng tài: nếu phát hiện thí sinh phạm luật thì giơ tay hô 'Challenge!' để giành quyền nói tiếp thời gian còn lại. Bạn nào giữ được lượt nói đến giây thứ 60 sẽ chiến thắng.\n" +
                             "Thời lượng: 10 - 15 phút. Dụng cụ: Đồng hồ đếm ngược 60 giây hoặc điện thoại.")
                .build()
        );

        // Cập nhật hoặc lưu mới nếu chưa tồn tại
        for (ActivityTemplate act : defaults) {
            java.util.Optional<ActivityTemplate> existingOpt = repository.findByName(act.getName());
            if (existingOpt.isPresent()) {
                ActivityTemplate existing = existingOpt.get();
                existing.setDescription(act.getDescription());
                existing.setIsSystemDefault(true);
                repository.save(existing);
            } else {
                act.setIsSystemDefault(true);
                repository.save(act);
            }
        }
    }

    public List<ActivityTemplate> getAllActivities() {
        return repository.findAll();
    }

    public ActivityTemplate createActivity(ActivityTemplate activity) {
        activity.setId(null);
        activity.setIsSystemDefault(false);
        return repository.save(activity);
    }

    public ActivityTemplate updateActivity(Long id, ActivityTemplate updated) {
        ActivityTemplate existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hoạt động có ID: " + id));
        if (Boolean.TRUE.equals(existing.getIsSystemDefault())) {
            throw new SecurityException("Không thể chỉnh sửa hoạt động mẫu mặc định của hệ thống.");
        }
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        return repository.save(existing);
    }

    public void deleteActivity(Long id) {
        ActivityTemplate existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hoạt động có ID: " + id));
        if (Boolean.TRUE.equals(existing.getIsSystemDefault())) {
            throw new SecurityException("Không thể xóa hoạt động mẫu mặc định của hệ thống.");
        }
        repository.delete(existing);
    }
}
