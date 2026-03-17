import { db } from "./db";
import { users, courses, lessons } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Check if admin user already exists
  const [existingAdmin] = await db.select().from(users).where(eq(users.username, "Musesaid_1"));
  
  if (!existingAdmin) {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin", 10);
    await db.insert(users).values({
      username: "Musesaid_1",
      password: hashedPassword,
      isAdmin: true,
    });
    console.log("✓ Admin user created (username: Musesaid_1, password: admin)");
  } else {
    console.log("✓ Admin user already exists");
  }

  // Check if courses already exist
  const existingCourses = await db.select().from(courses);
  
  if (existingCourses.length === 0) {
    // Seed special courses
    const specialCoursesData = [
      {
        courseId: "intellect",
        title: "Koorsada Ilmahaaga Caqli Sare u Yeel",
        description: "Make Your Child Highly Intelligent Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/11/wii-weel-2.png",
        category: "special",
        isLive: true,
        isFree: false,
        duration: "Live",
        order: 1,
      },
      {
        courseId: "independence",
        title: "Koorsada Ilmo Is-Dabira, Iskuna Filan",
        description: "Self-Reliant and Independent Child Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/11/gabar-weel-dhaqaysa1-1-150x150.png",
        category: "special",
        isLive: true,
        isFree: false,
        duration: "Live",
        order: 2,
      },
      {
        courseId: "father",
        title: "Koorsada Aabe Baraarugay",
        description: "Fatherhood Excellence Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/08/IMG_0152-1024x682.jpg",
        category: "special",
        isLive: false,
        isFree: true,
        duration: "3h",
        order: 3,
      },
      {
        courseId: "autism",
        title: "Koorsada Ilmaha hadalka ka soo Daaho (Autisimka)",
        description: "Autism and Speech Development Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/11/Gemini_Generated_Image_cdao1kcdao1kcdao-1-150x150.png",
        category: "special",
        isLive: true,
        isFree: false,
        duration: "Live",
        order: 4,
      },
      {
        courseId: "family",
        title: "Koorsada Xalinta Khilaafka Qoyska",
        description: "Family Conflict Resolution Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/11/Nov-15-2025-10_24_38-PM-150x150.png",
        category: "special",
        isLive: false,
        isFree: true,
        duration: "2h",
        order: 5,
      },
      {
        courseId: "free-trial",
        title: "Koorso Free ah Tijaabi oo Arag Casharadeena",
        description: "Free Trial Course to Experience Our Content",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/09/Designer-5_edited-e1763719365911-150x150.jpg",
        category: "special",
        isLive: false,
        isFree: true,
        duration: "1h",
        order: 6,
      },
    ];

    // Seed general courses
    const generalCoursesData = [
      {
        courseId: "0-6",
        title: "0-6 Bilood Jir Waa Koorsada 1aad",
        description: "First Course: 0-6 Months Old",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/10/Generated-Image-October-11-2025-6_22PM-150x150.png",
        category: "general",
        isLive: false,
        isFree: false,
        duration: "4h 30m",
        order: 1,
      },
      {
        courseId: "6-12",
        title: "6-12 Bilood jir Waa Koorsada 2aad",
        description: "Second Course: 6-12 Months Old",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/08/6-months-baby_edited_edited-150x150.jpg",
        category: "general",
        isLive: false,
        isFree: false,
        duration: "5h 15m",
        order: 2,
      },
      {
        courseId: "1-2",
        title: "1-2 Sano Jir Waa Koorsada 3aad",
        description: "Third Course: 1-2 Years Old",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/09/one-year-old-150x150.avif",
        category: "general",
        isLive: false,
        isFree: false,
        duration: "6h 00m",
        order: 3,
      },
      {
        courseId: "2-4",
        title: "2-4 Sano Jir Waa Koorsada 4aad",
        description: "Fourth Course: 2-4 Years Old",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/09/4-years-girl_edited_edited-1-150x150.jpg",
        category: "general",
        isLive: false,
        isFree: false,
        duration: "5h 45m",
        order: 4,
      },
      {
        courseId: "4-7",
        title: "4-7 Jir Waa Koorsada 5aad",
        description: "Fifth Course: 4-7 Years Old",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/08/1200px-Little_Somali_girl_edited-150x150.jpg",
        category: "general",
        isLive: false,
        isFree: false,
        duration: "7h 15m",
        order: 5,
      },
      {
        courseId: "free-general",
        title: "Koorso Free ah Tijaabi",
        description: "Free Trial Course",
        imageUrl: "https://barbaarintasan.com/wp-content/uploads/2025/08/somali-mother-e1759866129885-150x150.png",
        category: "general",
        isLive: false,
        isFree: true,
        duration: "1h",
        order: 6,
      },
    ];

    await db.insert(courses).values([...specialCoursesData, ...generalCoursesData]);
    console.log(`✓ Seeded ${specialCoursesData.length + generalCoursesData.length} courses`);

    // Seed sample lessons for the first course (0-6 months)
    const [course0_6] = await db.select().from(courses).where(eq(courses.courseId, "0-6"));
    
    if (course0_6) {
      const sampleLessons = [
        {
          courseId: course0_6.id,
          title: "Bisha 1aad - Soo Dhaweynta Ilmahaaga Cusub",
          description: "Cashar ku saabsan sida loo soo dhaweeyo ilmaha cusub iyo dhismaha xiriirka ugu horreeya.",
          videoUrl: "",
          textContent: "Marka ilmahaaga uu dhashay, waa muhiim in aad dhisto xiriir adag oo jacayl ah. Casharkan wuxuu ku barayaa sida loo soo dhaweeyo ilmaha cusub, sida loo hubo in uu dareemo nabadgelyo iyo jacayl.",
          order: 1,
          moduleNumber: 1,
          duration: "15 min",
        },
        {
          courseId: course0_6.id,
          title: "Bisha 2aad - Nidaaminta Hurdada iyo Cuntada",
          description: "Sida loo abuuro jadwal ku habboon hurdada iyo cuntada ilmaha.",
          videoUrl: "",
          textContent: "Ilmaha 2 bilood jira wuxuu bilaabayaa inuu yeesho nidaam. Casharkan wuxuu kugu hagayaa sida aad u abuurto jadwal caado ah oo hurdada iyo cuntada.",
          order: 2,
          moduleNumber: 2,
          duration: "20 min",
        },
        {
          courseId: course0_6.id,
          title: "Bisha 3aad - Kobcinta Xirfadaha Motor",
          description: "Horumarinta dhaqdhaqaaqa iyo xirfadaha jirka ilmaha.",
          videoUrl: "",
          textContent: "Ilmaha 3 bilood jira wuxuu bilaabayaa inuu xoojiyo xirfadaha jirka sida taabashada, qabashada, iyo madaxa kor u qaadida. Casharkan waxaad ka baran doontaa sida aad u gacan siiso kobcintaan.",
          order: 3,
          moduleNumber: 3,
          duration: "18 min",
        },
      ];

      await db.insert(lessons).values(sampleLessons);
      console.log(`✓ Seeded ${sampleLessons.length} sample lessons for course "0-6 Bilood Jir"`);
    }
  } else {
    console.log("✓ Courses already exist");
  }

  console.log("Database seed completed!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
