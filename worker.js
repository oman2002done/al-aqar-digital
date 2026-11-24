
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      });

    // Check database connection
    if (url.pathname === "/health" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all();

        return json({
          success: true,
          project: "العقار الرقمي",
          database: "connected",
          tables: result.results.map(row => row.name)
        });
      } catch (error) {
        return json({
          success: false,
          error: "Database connection failed"
        }, 500);
      }
    }

    // Protect all management endpoints
    const token = request.headers.get("Authorization");
    if (!env.ADMIN_TOKEN || token !== `Bearer ${env.ADMIN_TOKEN}`) {
      return json({
        success: false,
        error: "Unauthorized"
      }, 401);
    }

    // List saved posts
    if (url.pathname === "/api/posts" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT * FROM posts ORDER BY created_at DESC LIMIT 100"
        ).all();

        return json({
          success: true,
          posts: result.results
        });
      } catch (error) {
        return json({
          success: false,
          error: "Could not load posts"
        }, 500);
      }
    }

    // Create a new draft
    if (url.pathname === "/api/posts" && request.method === "POST") {
      try {
        const body = await request.json();

        const title = String(body.title || "").trim();
        const content = String(body.content || "").trim();
        const caption = String(body.caption || "");
        const hashtags = String(body.hashtags || "");
        const postType = body.post_type === "reel" ? "reel" : "image";

        if (!title || !content) {
          return json({
            success: false,
            error: "Title and content are required"
          }, 400);
        }

        const result = await env.DB.prepare(`
          INSERT INTO posts
          (title, content, caption, hashtags, post_type, status)
          VALUES (?, ?, ?, ?, ?, 'draft')
        `).bind(
          title,
          content,
          caption,
          hashtags,
          postType
        ).run();

        return json({
          success: true,
          message: "تم حفظ المنشور كمسودة",
          post_id: result.meta.last_row_id
        }, 201);

      } catch (error) {
        return json({
          success: false,
          error: "Could not create post"
        }, 500);
      }
    }

    return json({
      success: false,
      error: "Route not found"
    }, 404);
  }
};
