import { db } from "./db";
import { lessons } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updateLessons() {
  console.log("Updating course lessons...");

  // Get the 0-6 course
  const courseId0_6 = "44f8d7ce-0279-479e-a895-bd2ae92c45b2"; // This is the ID from the database

  // Delete old lessons for this course
  await db.delete(lessons).where(eq(lessons.courseId, courseId0_6));
  console.log("✓ Deleted old lessons for 0-6 course");

  // Create new lessons with correct Somali titles for each month
  const newLessons = [
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA KOWAAD",
      description: "Waxbarista koorsada bisha kowaad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 1,
      moduleNumber: 1,
      duration: null,
    },
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA LABAAD",
      description: "Waxbarista koorsada bisha labaad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 2,
      moduleNumber: 2,
      duration: null,
    },
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA SADDEXAAD",
      description: "Waxbarista koorsada bisha saddexaad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 3,
      moduleNumber: 3,
      duration: null,
    },
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA AFRAAD",
      description: "Waxbarista koorsada bisha afraad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 4,
      moduleNumber: 4,
      duration: null,
    },
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA SHANAAD",
      description: "Waxbarista koorsada bisha shanaad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 5,
      moduleNumber: 5,
      duration: null,
    },
    {
      courseId: courseId0_6,
      title: "Koorsada 0-6 Bilood jirka BISHA LIXAAD",
      description: "Waxbarista koorsada bisha lixaad ee ilmaha 0-6 bilood.",
      videoUrl: null,
      textContent: null,
      order: 6,
      moduleNumber: 6,
      duration: null,
    },
  ];

  await db.insert(lessons).values(newLessons);
  console.log(`✓ Created ${newLessons.length} new lessons for 0-6 course`);
  console.log("Update completed!");
}

updateLessons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Update error:", error);
    process.exit(1);
  });
