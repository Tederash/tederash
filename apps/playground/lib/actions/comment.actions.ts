"use server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { revalidatePath } from "next/cache";

// Create a new comment
export const createComment = async (comment: string, recipeId: string) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return { id: `comment-${Date.now()}`, comment, recipe_id: recipeId };
  }

  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const supabase = createSupabaseClient();

  const { data, error } = await supabase.from("comments").insert({
    comment,
    user_id: userId,
    recipe_id: recipeId,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/recipes/${recipeId}`);

  return data;
};

// Get all comments for a recipe
export const getRecipeComments = async (recipeId: string) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return [
      {
        id: "comment-1",
        comment: "This recipe is wonderful and easy to follow!",
        user_id: "demo-user-1",
        recipe_id: recipeId,
        userFirstName: "Sara",
        userImageUrl: "",
        created_at: new Date().toISOString(),
      },
    ];
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = data.map((comment) => comment.user_id);

  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ userId: userIds }); // Get user details for each comment's author

  const commentsWithUserDetails = data.map((comment) => {
    const user = users.data.find((user) => user.id === comment.user_id);

    return {
      ...comment,
      userFirstName: user?.firstName,
      userImageUrl: user?.imageUrl,
    };
  });

  return commentsWithUserDetails; // Return the comments with user details
};
