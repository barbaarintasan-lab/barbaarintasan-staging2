import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RefreshCcw, Trophy, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import logoUrl from "@assets/NEW_LOGO-BSU_1_1768990258338.png";
import babyImageUrl from "@assets/generated_images/somali_baby_sitting_with_pillows_in_a_traditional_home.png";

// Question Images
import q1Image from "@assets/generated_images/somali_baby_on_a_scale_or_looking_healthy.png";
import q2Image from "@assets/generated_images/somali_baby_sitting_with_pillow_support.png";
import q3Image from "@assets/generated_images/somali_baby_looking_at_colorful_toys.png";
import q4Image from "@assets/generated_images/somali_baby_with_milk_bottle_or_spoon.png";
import q5Image from "@assets/generated_images/somali_baby_sleeping_peacefully.png";
import q6Image from "@assets/generated_images/somali_baby_laughing_or_babbling.png";
import q7Image from "@assets/generated_images/somali_baby_in_crib_at_night.png";

const questions = [
  {
    id: 1,
    question: "Misaanka caadiga ah ee ilmaha 5-bilood jirka ah waa imisa?",
    image: q1Image,
    options: [
      "3 ilaa 5 Kiilo",
      "6 ilaa 8.5 Kiilo",
      "9 ilaa 12 Kiilo",
      "15 Kiilo iyo ka badan"
    ],
    correctAnswer: 1 // Index of "6 ilaa 8.5 Kiilo"
  },
  {
    id: 2,
    question: "Ilmaha 5-bilood jirka ah ma fariisan karaa?",
    image: q2Image,
    options: [
      "Maya, weli ma fariisan karo",
      "Haa, keligiis ayuu si fiican u fariisan karaa",
      "Haa, isagoo la taageerayo oo dhabarka la xajinayo",
      "Haa, wuu istaagi karaa xitaa"
    ],
    correctAnswer: 2
  },
  {
    id: 3,
    question: "Maxaa lagu gartaa aragga ilmaha 5-bilood jirka ah?",
    image: q3Image,
    options: [
      "Wuxuu jecel yahay midabada madow iyo caddaan kaliya",
      "Wuxuu jecel yahay midabada dhalaalaya",
      "Waxba ma arki karo weli",
      "Wuxuu arkaa kaliya walxaha aadka u dhow"
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "Goorma ayaa lagu talinayaa in ilmaha la baro cuntada adag?",
    image: q4Image,
    options: [
      "4 bilood markuu jiro",
      "5 bilood markuu jiro",
      "6 bilood markuu gaaro",
      "Markuu dhashaba"
    ],
    correctAnswer: 2
  },
  {
    id: 5,
    question: "Imisa saacadood ayuu badanaa seexdaa ilmaha 5-bilood jirka ah maalintii?",
    image: q5Image,
    options: [
      "8 ilaa 10 saacadood",
      "12 ilaa 16 saacadood",
      "18 ilaa 20 saacadood",
      "24 saacadood"
    ],
    correctAnswer: 1
  },
  {
    id: 6,
    question: "Erayada uu ku hadaaqo ilmaha 5-bilood jirka ah waxaa ka mid ah?",
    image: q6Image,
    options: [
      "Baba, Mama (oo macno buuxa leh)",
      "Baa, Maa, Gaa (Hadaaq)",
      "Jumlad buuxda ayuu ku hadlaa",
      "Weli wax cod ah ma sameeyo"
    ],
    correctAnswer: 1
  },
  {
    id: 7,
    question: "Haddii ilmuhu habeenkii tooso, maxaa habboon in la sameeyo?",
    image: q7Image,
    options: [
      "In lala ciyaaro oo la qosliyo",
      "In nalka loo daaro oo lala sheekaysto",
      "In telefishin loo shido",
      "In aan lala sheekaysan, nalkana la daarin, laguna celiyo hurdada"
    ],
    correctAnswer: 3
  }
];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleStart = () => {
    setStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setIsAnswered(false);
    setSelectedOption(null);
  };

  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);

    if (optionIndex === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#38bdf8', '#f472b6', '#fbbf24']
      });
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
      if (score > questions.length / 2) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-body">
        <Card className="w-full max-w-md border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center p-8 text-center space-y-6">
            <div className="w-32 h-32 rounded-full flex items-center justify-center mb-4 overflow-hidden bg-white shadow-md p-1">
              <img src={logoUrl} alt="Barbaarintasan Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              Kadiska 5 Bilood Jirka Horumarka laga rabo
            </h1>

            <div className="w-full aspect-square max-w-xs rounded-2xl overflow-hidden shadow-lg my-4 border-4 border-white">
               <img src={babyImageUrl} alt="Nuune Soomaali ah" className="w-full h-full object-cover" />
            </div>

            <p className="text-muted-foreground text-lg">
              Tijaabi aqoontaada inaad fahamtay Casharkii horumarka ilmaha 5-bilood jirka ah!
            </p>
            <Button 
              size="lg" 
              className="w-full text-lg h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90 transition-all hover:scale-105"
              onClick={handleStart}
              data-testid="button-start-quiz"
            >
              Biloow Kediska
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-body">
        <Card className="w-full max-w-md border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="flex flex-col items-center p-8 text-center space-y-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mb-4"
            >
              <Trophy className="w-12 h-12 text-accent" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-foreground font-display">
              Natiijadaada!
            </h2>
            
            <div className="text-6xl font-bold text-primary font-display">
              {score} / {questions.length}
            </div>

            <p className="text-muted-foreground">
              {score === questions.length 
                ? "Maasha'Allah! Waa natiijo aad u fiican." 
                : score > questions.length / 2 
                  ? "Si fiican ayaad isku dayday!" 
                  : "Waad ku mahadsantahay ka qayb qaadashada."}
            </p>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-12 rounded-xl gap-2 font-semibold border-2"
              onClick={handleStart}
              data-testid="button-restart-quiz"
            >
              <RefreshCcw className="w-4 h-4" />
              Ku celi mar kale
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-body transition-colors duration-500">
      
      {/* Logo in Header during quiz */}
      <div className="mb-6">
        <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-full shadow-sm border-2 border-white" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-semibold text-muted-foreground">
            Su'aasha {currentQuestion + 1}/{questions.length}
          </span>
          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            Dhibcaha: {score}
          </span>
        </div>
        <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-3 rounded-full bg-muted" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardContent className="p-6 space-y-6">
                
                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm bg-gray-100">
                    <img 
                        src={questions[currentQuestion].image} 
                        alt="Question Illustration" 
                        className="w-full h-full object-cover"
                    />
                </div>

                <h2 className="text-xl font-bold text-foreground leading-relaxed font-display">
                  {questions[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => {
                    const isSelected = selectedOption === index;
                    const isCorrect = index === questions[currentQuestion].correctAnswer;
                    const showCorrectness = isAnswered && isCorrect;
                    const showIncorrectness = isAnswered && isSelected && !isCorrect;

                    let buttonClass = "w-full justify-start text-left h-auto py-4 px-5 text-base font-medium rounded-xl border-2 transition-all duration-200 ";
                    
                    if (showCorrectness) {
                      buttonClass += "bg-green-50 border-green-500 text-green-700 shadow-sm";
                    } else if (showIncorrectness) {
                      buttonClass += "bg-red-50 border-red-500 text-red-700 shadow-sm";
                    } else if (isSelected) {
                      buttonClass += "bg-primary/5 border-primary text-primary";
                    } else if (isAnswered) {
                      buttonClass += "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                    } else {
                      buttonClass += "bg-white border-gray-100 hover:border-primary/50 hover:bg-primary/5 text-gray-700 hover:shadow-md";
                    }

                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        className={buttonClass}
                        onClick={() => handleAnswer(index)}
                        disabled={isAnswered}
                        data-testid={`option-${index}`}
                      >
                        <div className="flex items-center w-full">
                          <span className="flex-1">{option}</span>
                          {showCorrectness && <CheckCircle2 className="w-5 h-5 text-green-600 ml-2" />}
                          {showIncorrectness && <XCircle className="w-5 h-5 text-red-500 ml-2" />}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
              
              {isAnswered && (
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                  <Button 
                    onClick={handleNext}
                    className="gap-2 rounded-xl font-bold px-6"
                    size="lg"
                    data-testid="button-next"
                  >
                    {currentQuestion < questions.length - 1 ? "Su'aasha Xigta" : "Natiijada"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
