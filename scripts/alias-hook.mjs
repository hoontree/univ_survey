/**
 * `@/…` → `src/…` 경로 별칭을 Node 런타임에서 해석해 주는 모듈 훅.
 * tsconfig의 paths는 타입체커·번들러만 아는 것이라, scripts/의 스크립트가
 * src/lib/* 를 그대로 import 하려면 이게 필요하다.
 *
 *   node --import ./scripts/alias-hook.mjs scripts/create-admin.ts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(new URL("../src/", import.meta.url).pathname).href;

register(
  `data:text/javascript,
   export async function resolve(specifier, context, nextResolve) {
     if (specifier.startsWith("@/")) {
       specifier = ${JSON.stringify(SRC)} + specifier.slice(2) + ".ts";
     }
     return nextResolve(specifier, context);
   }`,
  import.meta.url,
);
