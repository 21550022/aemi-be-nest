# Bằng chứng triển khai Azure

Ngày kiểm chứng: 24/10/2026 (Asia/Ho_Chi_Minh). Các SHA/run dưới đây là mốc bằng chứng; khi có merge mới, đối chiếu `/version` với run deploy mới nhất của nhánh tương ứng.

## Hạ tầng đã kiểm tra trực tiếp

- Repository public: [21550022/aemi-be-nest](https://github.com/21550022/aemi-be-nest).
- Hai plan `asp-aemi-be-staging`, `asp-aemi-be-production`: ARM trả `sku.name=F1`, `sku.tier=Free`.
- Web App Linux chạy `NODE|22-lts`, startup `node dist/main.js`, TLS tối thiểu 1.2, HTTPS Only bật, FTP/basic publishing authentication tắt.
- Hai managed identity riêng; Website Contributor giới hạn trên Web App tương ứng.
- Hai GitHub Environment: staging chỉ nhận nhánh staging, production chỉ nhận main; không có reviewer gate.
- Cả hai nhánh yêu cầu PR và `Quality checks`, nhánh phải cập nhật; áp dụng cả admin, không cho force push/xóa nhánh.

## Kiểm tra ứng dụng và CI

- Node.js 22: frozen install, format check, lint, typecheck, 17 unit test, 4 e2e, 3 script test và build đạt.
- Script test kiểm tra artifact sai branch/run/SHA/checksum; smoke test từ chối môi trường/SHA sai dù health trả 200; rollback từ chối PR, staging, repo khác, run lỗi và artifact hết hạn.
- Gói ZIP đã được giải nén và chạy độc lập ở chế độ staging; graceful shutdown đạt. Bản Linux được kiểm tra ngay trong CI trước deploy.
- [PR 1](https://github.com/21550022/aemi-be-nest/pull/1) và [PR 2](https://github.com/21550022/aemi-be-nest/pull/2) chạy CI, job deploy bị bỏ qua khi chưa merge.
- [Run staging mới nhất tại mốc này](https://github.com/21550022/aemi-be-nest/actions/runs/40060134078) thành công; build, xác minh artifact, OIDC, Azure deploy và smoke test đều đạt.
- Kiểm tra từ máy local: staging `/health` trả 200 với `Cache-Control: no-store`; `/version` trả `appEnv=staging`, SHA `a3cf98fa9ae1260c5069b08e19e96c69352e7fca`; `/missing` trả 404.
- Dùng API GitHub thật: nguồn rollback run `40060134078` bị từ chối vì là staging, trước bước đăng nhập/deploy Azure.

## Production đầu tiên

- [PR 3: staging vào main](https://github.com/21550022/aemi-be-nest/pull/3) đã merge; sự kiện push main tự kích hoạt [run production](https://github.com/21550022/aemi-be-nest/actions/runs/40060285319).
- HTTP từ máy local: `/health` trả 200 và `status=ok`; `/version` trả `appEnv=production`, SHA `8baee205301aa1a54e7d74f94569564c3964f70f`.
- URL staging: <https://aemi-be-21550022-staging.azurewebsites.net>.
- URL production: <https://aemi-be-21550022-production.azurewebsites.net>.

## Phát hành lần hai

- [PR 4](https://github.com/21550022/aemi-be-nest/pull/4) đưa tài liệu vào staging; [run staging](https://github.com/21550022/aemi-be-nest/actions/runs/40060521944) đạt với SHA `755735d2031300ddd5ceb5fd4dce1bcc401b646f`.
- [PR 5](https://github.com/21550022/aemi-be-nest/pull/5) đưa staging vào main; [run production](https://github.com/21550022/aemi-be-nest/actions/runs/40060715440) đạt với SHA `9634a2bcaec7210401efe3fdac48aab19ca3d550`.
- Trước rollback, HTTP production `/version` đã xác nhận đúng SHA lần hai. Hai môi trường có SHA khác nhau vì build theo commit nhánh đích, không dùng chung artifact.

## Diễn tập khôi phục phiên bản (rollback)

- [Workflow rollback thực tế](https://github.com/21550022/aemi-be-nest/actions/runs/40060866674) hoàn tất thành công trên main, nguồn là CI run `40060285319`.
- Trước rollback: production `/version` là `9634a2bcaec7210401efe3fdac48aab19ca3d550`.
- Sau rollback: production `/version` là `8baee205301aa1a54e7d74f94569564c3964f70f`, `appEnv=production`; health/version smoke test đạt.
- Workflow đã kiểm tra nguồn run, tải artifact còn hạn từ run khác, xác minh metadata/checksum, đăng nhập OIDC và deploy lại ZIP. Không checkout/build mã cũ để tạo artifact mới.
- Sau diễn tập, tiếp tục phát hành tài liệu này qua PR vào staging rồi main để production chạy bản mới nhất. Xem run push main mới nhất và `/version` để xác định phiên bản đang phục vụ; SHA rollback ở trên là mốc lịch sử, không phải cam kết phiên bản hiện tại.

## Sự cố đã xử lý

Run staging đầu tiên lỗi `AADSTS700213`: repo mới sử dụng immutable OIDC subject có ID owner/repository. Đã đối chiếu subject trong log, cập nhật federated credential cả hai môi trường và sửa script bootstrap đọc `sub_claim_prefix` từ API. [Run sau khi sửa](https://github.com/21550022/aemi-be-nest/actions/runs/40059862366/attempts/2) thành công.

`actionlint` 1.7.12 chưa hiểu khóa `queue: max`; phần còn lại đã được kiểm tra, và GitHub đã chấp nhận/chạy cấu hình này. GitHub cũng có annotation về các action Node 20 đang được runner chuyển sang Node 24; các job thực tế vẫn đạt.

## Giới hạn và bước thực hành tiếp theo

- Đây là lab F1, chưa có database, đăng nhập, frontend, domain riêng hoặc kiểm thử tải/HA.
- Chưa tự tạo budget alert vì chưa có mức ngân sách/email được chọn; có hướng dẫn trong tài liệu. Không nâng cấp sang gói trả phí.
- OpenAPI đã được nhập vào Yaak; URL health/version được kiểm chứng bằng HTTP và CI. Chưa kết luận mọi request/environment đã được bấm kiểm tra trên GUI Yaak.
- Lưu artifact 30 ngày; khi hết hạn không thể dùng run đó để rollback.
- Xem [hướng dẫn từng bước](azure-deployment.md) để tự thực hành, theo dõi log và dọn tài nguyên.
