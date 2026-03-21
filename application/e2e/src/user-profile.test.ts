import { expect, test } from "@playwright/test";

import { dynamicMediaMask, waitForVisibleMedia } from "./utils";

test.describe("ユーザー詳細", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("タイトルが「{ユーザー名} さんのタイムライン - CaX」", async ({ page }) => {
    await page.goto("/users/o6yq16leo");
    await expect(page).toHaveTitle(/さんのタイムライン - CaX/, {
      timeout: 30_000,
    });
  });

  test("ページ上部がユーザーサムネイル画像の色を抽出した色になっている", async ({ page }) => {
    await page.route("**/api/v1/users/o6yq16leo/posts**", async (route) => {
      const response = await route.fetch();
      const posts = (await response.json()) as Models.Post[];
      const basePost = posts[0];

      if (basePost == null) {
        await route.fulfill({ response });
        return;
      }

      const syntheticPost: Models.Post = {
        ...basePost,
        createdAt: "2026-03-21T00:00:00.000Z",
        id: "vrt-user-profile-image-post",
        images: [
          {
            alt: "",
            createdAt: "2026-03-21T00:00:00.000Z",
            height: 900,
            id: "737f764e-f495-4104-b6d6-8434681718d5",
            updatedAt: "2026-03-21T00:00:00.000Z",
            width: 1600,
          },
        ],
        movie: null,
        sound: null,
        text: "画像テスト",
        updatedAt: "2026-03-21T00:00:00.000Z",
      };

      await route.fulfill({ json: [syntheticPost, ...posts], response });
    });

    await page.goto("/users/o6yq16leo");

    const headerDiv = page.locator("header > div").first();
    await expect(headerDiv).toBeVisible({ timeout: 30_000 });

    await expect(async () => {
      const bgColor = await headerDiv.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(bgColor).toMatch(/^rgb/);
    }).toPass({ timeout: 30_000 });

    // VRT: ユーザー詳細（無限スクロールがあるため viewport のみ）
    await waitForVisibleMedia(page);
    await expect(page).toHaveScreenshot("user-profile-ユーザー詳細.png", {
      fullPage: false,
      mask: dynamicMediaMask(page),
    });
  });
});
