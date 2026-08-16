/**
 * 관리자 계정 추가 (개발자용 일회성 스크립트).
 *
 * `/admin` UI의 계정 추가는 이미 로그인한 관리자만 쓸 수 있어서, 로그인 수단이
 * 없는 상태에서 계정을 하나 더 발급할 때 쓴다. 기존 계정은 건드리지 않는다.
 *
 *   npm run create-admin -- <아이디>
 *
 * 비밀번호는 인자·환경변수로 받지 않고 실행 중에 직접 입력받는다(에코 없음).
 * 셸 히스토리·프로세스 목록에 평문이 남지 않게 하기 위함.
 */
import { createInterface } from "node:readline";
import { createAdmin, listAdmins } from "../src/lib/admins.ts";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // readline의 화면 출력 자체를 막는다 — 입력한 비밀번호가 터미널에 남지 않게.
    (rl as unknown as { _writeToOutput: (c: string) => void })._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const username = process.argv[2];
if (!username) {
  console.error("사용법: npm run create-admin -- <아이디>");
  process.exit(1);
}

const existing = await listAdmins();
console.log(`현재 관리자 ${existing.length}명: ${existing.map((a) => a.username).join(", ") || "(없음)"}`);
if (existing.some((a) => a.username === username.trim().toLowerCase())) {
  console.error("이미 있는 아이디예요. 다른 아이디를 쓰세요.");
  process.exit(1);
}

const password = await promptHidden(`'${username}' 비밀번호(8자 이상, 화면에 안 보임): `);
const confirm = await promptHidden("한 번 더 입력: ");
if (password !== confirm) {
  console.error("두 입력이 달라요. 아무것도 만들지 않았습니다.");
  process.exit(1);
}

const result = await createAdmin(username, password);
if (!result.ok) {
  console.error(`실패: ${result.error}`);
  process.exit(1);
}
console.log(`계정 '${username.trim().toLowerCase()}' 생성 완료. /admin 에서 로그인하세요.`);
