import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, Download, Upload, Wand2, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

// --- Utility helpers ---
const round = (n, p = 1) => Math.round(n * 10 ** p) / 10 ** p;
const grams = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")))
    .join("\n");
  return csv;
};

// --- Example embedded food database (per 100g) ---
const BASE_DB = [
  { name: "Egg, whole", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Chicken breast, skinless", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Rice, white, cooked", kcal: 130, protein: 2.4, carbs: 28, fat: 0.3 },
  { name: "Rice, basmati, cooked", kcal: 121, protein: 3.5, carbs: 25.2, fat: 0.4 },
  { name: "Chapati/roti (atta)", kcal: 297, protein: 9.6, carbs: 54, fat: 3.2 },
  { name: "Dal (lentils), cooked", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Beef, lean", kcal: 250, protein: 26, carbs: 0, fat: 15 },
  { name: "Mutton, lean", kcal: 294, protein: 25, carbs: 0, fat: 21 },
  { name: "Fish, rohu", kcal: 97, protein: 17, carbs: 0, fat: 3 },
  { name: "Milk, cow, 3.5%", kcal: 64, protein: 3.4, carbs: 4.8, fat: 3.6 },
  { name: "Yogurt, plain", kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Apple", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Dates, dried", kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 },
  { name: "Peanut butter", kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Almonds", kcal: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Oil, vegetable", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Potato, boiled", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { name: "Biryani (avg)", kcal: 185, protein: 6.5, carbs: 22, fat: 7 },
  { name: "Samosa (avg)", kcal: 308, protein: 7, carbs: 34, fat: 17 },
];

const defaultGoal = {
  kcal: 2200,
  protein: 120,
  carbs: 250,
  fat: 70,
};

const defaultPrefs = {
  unit: "g", // or "serving"
  theme: "light",
};

// --- Main component ---
export default function CalorieMeasureApp() {
  const [query, setQuery] = useState("");
  const [db, setDb] = useState(() => {
    const saved = localStorage.getItem("cm_db");
    return saved ? JSON.parse(saved) : BASE_DB;
  });
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("cm_items");
    return saved ? JSON.parse(saved) : [];
  });
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem("cm_goal");
    return saved ? JSON.parse(saved) : defaultGoal;
  });
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem("cm_prefs");
    return saved ? JSON.parse(saved) : defaultPrefs;
  });
  const [meal, setMeal] = useState("Any");
  const [gramsInput, setGramsInput] = useState("100");
  const [customFood, setCustomFood] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  useEffect(() => localStorage.setItem("cm_db", JSON.stringify(db)), [db]);
  useEffect(() => localStorage.setItem("cm_items", JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem("cm_goal", JSON.stringify(goal)), [goal]);
  useEffect(() => localStorage.setItem("cm_prefs", JSON.stringify(prefs)), [prefs]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.filter((f) => f.name.toLowerCase().includes(q));
  }, [query, db]);

  const totals = useMemo(() => {
    const base = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    return items.reduce((acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }), base);
  }, [items]);

  const addToLog = (food) => {
    const g = grams(gramsInput) || 100;
    const factor = g / 100;
    const entry = {
      id: crypto.randomUUID(),
      name: food.name,
      meal: meal,
      grams: g,
      kcal: round(food.kcal * factor, 1),
      protein: round(food.protein * factor, 1),
      carbs: round(food.carbs * factor, 1),
      fat: round(food.fat * factor, 1),
      ts: Date.now(),
    };
    setItems((x) => [entry, ...x]);
  };

  const deleteItem = (id) => setItems((x) => x.filter((i) => i.id !== id));
  const clearAll = () => setItems([]);

  const importCSV = (text) => {
    try {
      const [header, ...lines] = text.trim().split(/\r?\n/);
      const cols = header.split(",");
      const mapped = lines.map((ln) => {
        const vals = ln.split(",").map((v) => JSON.parse(v));
        const obj = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
        return { ...obj, id: crypto.randomUUID(), ts: Date.now() };
      });
      setItems((x) => [...mapped, ...x]);
    } catch (e) {
      alert("Invalid CSV");
    }
  };

  const exportCSV = () => {
    const csv = toCSV(items.map(({ id, ts, ...rest }) => rest));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calorie-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCustomFood = () => {
    const { name, kcal, protein, carbs, fat } = customFood;
    if (!name) return alert("Enter a food name");
    const food = {
      name: name.trim(),
      kcal: grams(kcal),
      protein: grams(protein),
      carbs: grams(carbs),
      fat: grams(fat),
    };
    setDb((x) => [food, ...x]);
    setCustomFood({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calorie Measure</h1>
            <p className="text-slate-500 text-sm">Search foods, add portions, and track calories & macros — fast.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV} className="rounded-2xl"><Download className="w-4 h-4 mr-2"/>Export</Button>
            <label className="cursor-pointer">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => importCSV(String(reader.result));
                reader.readAsText(file);
              }}/>
              <div className="inline-flex items-center rounded-2xl border px-3 py-2 hover:bg-slate-50"><Upload className="w-4 h-4 mr-2"/>Import</div>
            </label>
          </div>
        </motion.header>

        <Tabs defaultValue="tracker" className="mt-6">
          <TabsList className="grid grid-cols-2 sm:w-96">
            <TabsTrigger value="tracker">Calorie Tracker</TabsTrigger>
            <TabsTrigger value="needs">Daily Needs</TabsTrigger>
          </TabsList>

          <TabsContent value="tracker" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2 rounded-2xl">
                <CardHeader>
                  <CardTitle>Find Food</CardTitle>
                  <CardDescription>Built‑in database per 100 g. Add your portion to the log.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                      <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search 'rice', 'egg', 'biryani'…" className="pl-9"/>
                    </div>
                    <Select value={meal} onValueChange={setMeal}>
                      <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Meal"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="Breakfast">Breakfast</SelectItem>
                        <SelectItem value="Lunch">Lunch</SelectItem>
                        <SelectItem value="Dinner">Dinner</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input type="number" inputMode="decimal" min={0} value={gramsInput} onChange={(e)=>setGramsInput(e.target.value)} className="w-28"/>
                      <span className="text-sm text-slate-500">g</span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {results.slice(0, 12).map((food) => (
                      <motion.div key={food.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="rounded-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{food.name}</CardTitle>
                            <CardDescription className="text-xs">per 100 g</CardDescription>
                          </CardHeader>
                          <CardContent className="grid grid-cols-4 text-sm gap-2">
                            <Macro label="kcal" value={food.kcal} />
                            <Macro label="P" value={food.protein} />
                            <Macro label="C" value={food.carbs} />
                            <Macro label="F" value={food.fat} />
                          </CardContent>
                          <CardFooter className="justify-end">
                            <Button size="sm" className="rounded-2xl" onClick={() => addToLog(food)}>
                              <Plus className="w-4 h-4 mr-1"/> Add {gramsInput || 100} g
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Daily Goal</CardTitle>
                  <CardDescription>Adjust to your target; compare below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["kcal","protein","carbs","fat"]).map((k)=> (
                    <div key={k} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{k}</Label>
                        <Input type="number" value={goal[k]} onChange={(e)=> setGoal({...goal,[k]: grams(e.target.value)})} className="w-28"/>
                      </div>
                      <Progress value={Math.min(100, (totals[k] / (goal[k]||1)) * 100)} />
                      <div className="text-xs text-slate-500">{round(totals[k],1)} / {goal[k]} {k === 'kcal' ? 'kcal' : 'g'}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Food Log</CardTitle>
                <CardDescription>Your added foods. Edit by re-adding; remove via delete.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="p-2">Food</th>
                        <th className="p-2">Meal</th>
                        <th className="p-2">g</th>
                        <th className="p-2">kcal</th>
                        <th className="p-2">P</th>
                        <th className="p-2">C</th>
                        <th className="p-2">F</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="p-2">{it.name}</td>
                          <td className="p-2">{it.meal}</td>
                          <td className="p-2">{it.grams}</td>
                          <td className="p-2">{it.kcal}</td>
                          <td className="p-2">{it.protein}</td>
                          <td className="p-2">{it.carbs}</td>
                          <td className="p-2">{it.fat}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" onClick={() => deleteItem(it.id)}>
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="p-2">Total</td>
                        <td className="p-2"/>
                        <td className="p-2"/>
                        <td className="p-2">{round(totals.kcal,1)}</td>
                        <td className="p-2">{round(totals.protein,1)}</td>
                        <td className="p-2">{round(totals.carbs,1)}</td>
                        <td className="p-2">{round(totals.fat,1)}</td>
                        <td className="p-2"/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="destructive" onClick={clearAll} className="rounded-2xl"><Trash2 className="w-4 h-4 mr-2"/>Clear all</Button>
                <div className="text-sm text-slate-500">Tip: Export your log as CSV to keep records.</div>
              </CardFooter>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Add Custom Food</CardTitle>
                <CardDescription>Values per 100 g (kcal & grams). Add local dishes or packaged foods.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-5 gap-3">
                <Input placeholder="Name" value={customFood.name} onChange={(e)=> setCustomFood({...customFood, name: e.target.value})} />
                <Input placeholder="kcal" type="number" inputMode="decimal" value={customFood.kcal} onChange={(e)=> setCustomFood({...customFood, kcal: e.target.value})} />
                <Input placeholder="Protein (g)" type="number" inputMode="decimal" value={customFood.protein} onChange={(e)=> setCustomFood({...customFood, protein: e.target.value})} />
                <Input placeholder="Carbs (g)" type="number" inputMode="decimal" value={customFood.carbs} onChange={(e)=> setCustomFood({...customFood, carbs: e.target.value})} />
                <div className="flex gap-2">
                  <Input placeholder="Fat (g)" type="number" inputMode="decimal" value={customFood.fat} onChange={(e)=> setCustomFood({...customFood, fat: e.target.value})} />
                  <Button onClick={addCustomFood} className="shrink-0 rounded-2xl"><Wand2 className="w-4 h-4 mr-2"/>Add</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="needs" className="mt-6 space-y-6">
            <DailyNeeds onSetGoal={setGoal} />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Built with ♥ — data is stored locally in your browser.
        </footer>
      </div>
    </div>
  );
}

function Macro({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function DailyNeeds({ onSetGoal }) {
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(175); // cm
  const [weight, setWeight] = useState(70); // kg
  const [activity, setActivity] = useState(1.55); // moderate
  const [proteinPerKg, setProteinPerKg] = useState(1.6);
  const [carbSplit, setCarbSplit] = useState(50); // % of kcal
  const [fatSplit, setFatSplit] = useState(25); // % of kcal

  const BMR = useMemo(() => {
    // Mifflin-St Jeor
    return sex === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  }, [sex, age, height, weight]);

  const TDEE = useMemo(() => BMR * activity, [BMR, activity]);

  const proteinG = useMemo(() => round(weight * proteinPerKg), [weight, proteinPerKg]);
  const fatKcal = useMemo(() => (fatSplit / 100) * TDEE, [fatSplit, TDEE]);
  const fatG = useMemo(() => round(fatKcal / 9), [fatKcal]);
  const carbKcal = useMemo(() => (carbSplit / 100) * TDEE, [carbSplit, TDEE]);
  const carbG = useMemo(() => round(carbKcal / 4), [carbKcal]);

  useEffect(() => {
    const g = { kcal: Math.round(TDEE), protein: proteinG, carbs: carbG, fat: fatG };
    onSetGoal(g);
  }, [TDEE, proteinG, carbG, fatG, onSetGoal]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Daily Calorie & Macro Needs</CardTitle>
        <CardDescription>Based on Mifflin‑St Jeor and your activity level. Adjust sliders to personalize.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" className="mt-1" value={age} onChange={(e)=> setAge(grams(e.target.value))}/>
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" className="mt-1" value={height} onChange={(e)=> setHeight(grams(e.target.value))}/>
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" className="mt-1" value={weight} onChange={(e)=> setWeight(grams(e.target.value))}/>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activity multiplier</Label>
            <Select value={String(activity)} onValueChange={(v)=> setActivity(parseFloat(v))}>
              <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="1.2">Sedentary (little/no exercise)</SelectItem>
                <SelectItem value="1.375">Light (1–3 days/week)</SelectItem>
                <SelectItem value="1.55">Moderate (3–5 days/week)</SelectItem>
                <SelectItem value="1.725">Very active (6–7 days/week)</SelectItem>
                <SelectItem value="1.9">Extra active (physical job)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between"><Label>Protein (g/kg)</Label><span className="text-sm text-slate-500">{proteinPerKg}</span></div>
              <Slider value={[proteinPerKg]} min={0.8} max={2.5} step={0.1} onValueChange={(v)=> setProteinPerKg(round(v[0],1))}/>
            </div>
            <div>
              <div className="flex items-center justify-between"><Label>Carbs (% kcal)</Label><span className="text-sm text-slate-500">{carbSplit}%</span></div>
              <Slider value={[carbSplit]} min={20} max={65} step={1} onValueChange={(v)=> setCarbSplit(v[0])}/>
            </div>
            <div>
              <div className="flex items-center justify-between"><Label>Fat (% kcal)</Label><span className="text-sm text-slate-500">{fatSplit}%</span></div>
              <Slider value={[fatSplit]} min={15} max={40} step={1} onValueChange={(v)=> setFatSplit(v[0])}/>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Stat title="BMR" value={`${Math.round(BMR)} kcal`} subtitle="Basal Metabolic Rate"/>
          <Stat title="TDEE" value={`${Math.round(TDEE)} kcal`} subtitle="Total Daily Energy Expenditure"/>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat title="Protein" value={`${proteinG} g`} />
            <MiniStat title="Carbs" value={`${carbG} g`} />
            <MiniStat title="Fat" value={`${fatG} g`} />
          </div>
          <Button className="rounded-2xl" onClick={()=> onSetGoal({ kcal: Math.round(TDEE), protein: proteinG, carbs: carbG, fat: fatG })}>
            <Settings2 className="w-4 h-4 mr-2"/>Set as Daily Goal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ title, value, subtitle }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-lg">{title}</CardTitle><CardDescription>{subtitle}</CardDescription></CardHeader>
      <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
