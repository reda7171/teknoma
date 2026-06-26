import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new Error("No admin user found")

    const articles = [
        {
            title: "Why Dystopian Fiction Feels So Real Right Now",
            slug: "why-dystopian-fiction-feels-real",
            excerpt: "From '1984' to modern YA hits, dystopian literature is more popular than ever. Explore why we are collectively drawn to stories about the end of the world.",
            content: `## The Comfort of the Apocalypse\n\nIt might seem counterintuitive to read about crumbling societies, oppressive governments, and post-apocalyptic wastelands when our real-world news cycle is already stressful. Yet, dystopian fiction remains one of the highest-selling literary genres. Why do we seek out such dark subject matter?\n\n### A Safe Space for Anxiety\n\nDystopian literature allows readers to process their real-world anxieties in a controlled, safe environment. When you read about a character navigating a ruined society, you are essentially rehearsing survival. You get to face worst-case scenarios without actual danger, which provides a strange, cathartic sense of relief.\n\n### The Warning Sign\n\nAuthors like George Orwell, Margaret Atwood, and Ray Bradbury did not write dystopias merely to entertain; they wrote them to warn us. These novels take a current societal trend—whether it is surveillance, environmental neglect, or extreme consumerism—and push it to its logical, terrifying conclusion.\n\nReading these books acts as a societal alarm bell. It reminds us of the fragility of our institutions and the importance of remaining vigilant. When a reader says, *"This feels too real,"* the author has successfully done their job.\n\n### The Ultimate Underdog Story\n\nAt the heart of almost every dystopian novel is a rebellion. A single individual or a small group of friends decides that the oppressive system is unacceptable and chooses to fight back, often against impossible odds. \n\nThis is the true appeal of the genre. In a world where individuals often feel powerless against massive corporations or governments, dystopian heroes remind us that one person's courage can spark a revolution. It is not just literature about despair; it is literature about the resilience of the human spirit.`,
            coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        },
        {
            title: "The Fascinating Psychology Behind Plot Twists",
            slug: "psychology-behind-plot-twists",
            excerpt: "Why do we love to be tricked by authors? Delve into the cognitive science of the plot twist and what makes a surprise ending truly unforgettable.",
            content: `## The Anatomy of a Surprise\n\nThere is nothing quite like the physical reaction to a brilliant plot twist. Your jaw drops, you flip back a few pages to see how you missed the clues, and your brain floods with dopamine. But what exactly is happening in our minds when an author pulls the rug out from under us?\n\n### The Brain as a Prediction Machine\n\nNeurologically speaking, the human brain is a prediction machine. As we read a story, our brain is constantly generating hypotheses about what will happen next based on past experiences and narrative tropes. \n\nWhen a plot twist occurs, it creates what psychologists call a "schema violation." The brain's prediction model is shattered. This sudden gap between expectation and reality forces the brain into a state of hyper-arousal, releasing dopamine and making the moment incredibly memorable.\n\n### The Difference Between a Good and Bad Twist\n\nNot all plot twists are created equal. A bad twist—like the infamous "it was all a dream" trope—feels like a betrayal. It cheats the reader because the clues were never there.\n\nA masterful plot twist, however, changes the context of everything you have read up to that point without breaking the internal logic of the world. \n\nPsychologists refer to this as the "hindsight bias." Once the twist is revealed, the reader should look back and realize the truth was hiding in plain sight. It should feel inevitable, yet completely surprising.\n\n### The Trust Fall\n\nReading a mystery or a thriller is essentially an elaborate game of cat-and-mouse between the author and the reader. We want the author to outsmart us. When we are successfully fooled by a well-earned twist, it builds a deep sense of trust and admiration for the writer's intellect.\n\nNext time you are completely blindsided by a book's ending, appreciate the complex cognitive manipulation the author just pulled off. It is literal mind control, and we love every second of it.`,
            coverImage: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        },
        {
            title: "How to Read More When You Have Zero Free Time",
            slug: "how-to-read-more-zero-free-time",
            excerpt: "A practical guide for busy professionals, parents, and students on how to sneak more reading into an impossibly packed schedule.",
            content: `## The Myth of "Free Time"\n\nThe most common excuse for not reading is a lack of time. But if we track our screen time, most of us will find hours lost to social media scrolling, binge-watching television, or staring at our inboxes. \n\nYou don't need to find a magical two-hour block of silence to read. You just need to change how you perceive time.\n\n### 1. The 10-Page Rule\n\nInstead of aiming to read for an hour, aim to read just 10 pages a day. Ten pages takes the average reader about 15 minutes. \nIf you read 10 pages a day, you will finish a 300-page book in exactly one month. That is 12 books a year, achieved by dedicating just 15 minutes a day.\n\n### 2. Pair Reading with Existing Habits (Habit Stacking)\n\nJames Clear, author of Atomic Habits, popularized the concept of "Habit Stacking." Tie your reading habit to something you already do every single day without fail.\n*   Read while drinking your morning coffee.\n*   Read while waiting for your laundry to finish.\n*   Read for exactly 10 minutes after you brush your teeth at night.\n\n### 3. Embrace Audiobooks\n\nAudiobooks count as reading. Period. \nIf you have a 30-minute commute to work, that is an hour of "reading" time every day. You can listen while cooking, cleaning, or walking the dog. Suddenly, your most mundane chores become opportunities for literary exploration.\n\n### 4. Ditch the "Sunk Cost Fallacy"\n\nIf you are three weeks into a book and you are only on page 40, you are experiencing reading friction. Put the book down. \nMany people stop reading entirely because they feel obligated to finish a boring book before starting a new one. Give yourself permission to abandon books that don't grab your attention. Life is too short, and your time is too valuable.\n\n## Make It Visible\n\nOut of sight, out of mind. Leave your book on your pillow, on the kitchen counter, or next to your laptop. Make the physical presence of the book a constant visual cue throughout your day.`,
            coverImage: "https://images.unsplash.com/photo-1497561836812-5353ce427218?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        },
        {
            title: "The Hidden Benefits of Reading Fiction Before Bed",
            slug: "benefits-reading-fiction-before-bed",
            excerpt: "Swap your smartphone for a novel tonight. Discover why reading fiction is the ultimate scientifically-backed sleep aid.",
            content: `## The Pre-Sleep Routine\n\nFor millions of people, the final activity of the day involves staring at a glowing screen—checking emails, scrolling through news feeds, or watching videos. Consequently, insomnia and poor sleep quality are at an all-time high.\n\nSleep experts universally agree that replacing screen time with a physical book is one of the most effective ways to cure sleep issues. But why fiction specifically?\n\n### The Transition State\n\nTo fall asleep, your brain needs to transition from a state of active alertness (Beta waves) to a state of relaxed awareness (Alpha waves). \n\nReading non-fiction, self-help, or business books before bed often stimulates the brain. You start thinking about how to apply the lessons to your life, or you get stressed about work. \n\nFiction, however, requires a different type of cognitive engagement. It pulls your focus away from your own life and immerses you in an alternate reality. This detachment is crucial for letting go of the day's stress.\n\n### The Blue Light Problem\n\nDigital screens emit blue light, which tricks the pineal gland into halting the production of melatonin (the hormone that makes you sleepy). \n\nReading a physical paperback book under a warm bedside lamp does not disrupt your circadian rhythm. In fact, the rhythmic, repetitive motion of moving your eyes left to right across a page naturally induces a state of physical relaxation.\n\n### Improved Dream Quality\n\nWhat we consume before bed directly influences our subconscious mind. Reading anxiety-inducing news often leads to restless sleep. Conversely, immersing yourself in a beautifully written narrative primes your subconscious for more vivid, creative, and peaceful dreams.\n\n## Setting the Habit\n\nTonight, try leaving your phone charging in the kitchen. Keep a novel on your nightstand. Even if you only read three pages before your eyes get heavy, you will have successfully signaled to your brain that the day is over, and it is safe to rest.`,
            coverImage: "https://images.unsplash.com/photo-1513217208493-9c168f123f1b?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        },
        {
            title: "The Rise of Audiobooks: Is Listening the Same as Reading?",
            slug: "audiobooks-vs-reading-cognitive-science",
            excerpt: "As audiobooks surge in popularity, a heated debate has emerged. Does listening to a book offer the same cognitive benefits as reading the physical pages?",
            content: `## The Audiobook Revolution\n\nAudiobooks are the fastest-growing format in the publishing industry. They have transformed commutes, workouts, and household chores into opportunities for literary consumption. \n\nHowever, a persistent stigma remains among literary purists who argue that listening to a book is "cheating." But what does cognitive science have to say about this debate?\n\n### Brain Activation: Eyes vs. Ears\n\nA fascinating study conducted by neuroscientists at UC Berkeley mapped the brain activity of participants while they listened to a story and while they read the exact same story. \n\nThe results were clear: the brain maps were virtually identical. The semantic processing—the way the brain extracts meaning, emotion, and context from words—occurred in the exact same regions of the brain, regardless of whether the input was visual or auditory.\n\n### The Nuance of Comprehension\n\nWhile the brain processes the meaning similarly, the format you choose should depend on the *type* of book you are consuming.\n\n*   **Complex Material:** If you are reading a dense non-fiction book with complex arguments, statistics, or philosophical concepts, print is superior. Physical books allow you to pause, reread a sentence, check a footnote, and visually map the structure of the argument.\n*   **Narrative and Emotion:** For fiction, memoirs, and storytelling, audiobooks can actually enhance the experience. Human beings possess a deeply ingrained oral storytelling tradition that predates written language by tens of thousands of years. Hearing a skilled narrator bring characters to life with distinct voices and emotional pacing can make a novel significantly more impactful.\n\n### Accessibility and Inclusion\n\nWe must also acknowledge that audiobooks have made literature accessible to millions of people who struggle with print. This includes individuals with dyslexia, visual impairments, or severe ADHD. For them, audiobooks are not a convenience; they are a vital bridge to the world of literature.\n\n## The Verdict\n\nReading is not a competition. Whether you prefer the tactile feel of paper, the convenience of an e-reader, or the immersive experience of an audiobook, you are engaging with ideas, expanding your empathy, and supporting authors. There is no wrong way to consume a good story.`,
            coverImage: "https://images.unsplash.com/photo-1505682634904-d7c8d95cdc50?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        }
    ]

    for (const article of articles) {
        await prisma.post.create({
            data: {
                ...article,
                published: true,
                publishedAt: new Date(),
                authorId: admin.id,
                viewCount: Math.floor(Math.random() * 1000) + 100,
                category: 'General'
            }
        })
    }

    console.log("5 ENGLISH articles created successfully.")
}

main().finally(() => prisma.$disconnect())
