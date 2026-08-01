-- AdLens — paste this whole file into Neon's SQL Editor and click Run
DROP TABLE IF EXISTS ads, adsets, recommendations, alerts, campaigns CASCADE;

CREATE TABLE campaigns (
  id text PRIMARY KEY, name text NOT NULL, platform text NOT NULL, status text NOT NULL,
  objective text, spend int, revenue int, roas real, ctr real, cpc real,
  conv int, pacing int, health text, note text, spark jsonb
);
CREATE TABLE adsets (
  id text PRIMARY KEY, campaign_id text REFERENCES campaigns(id), name text NOT NULL,
  health text, health_label text, spend int, revenue int, roas real, ctr real, cpc real,
  freq real, conv int, reach_pct int, note text,
  ctr_trend jsonb, cpa_trend jsonb, kpi_deltas jsonb, insight jsonb
);
CREATE TABLE ads (
  id text PRIMARY KEY, adset_id text REFERENCES adsets(id), name text NOT NULL, format text,
  spend int, ctr real, roas real, freq real, conv int, action text, rank text, rank_label text
);
CREATE TABLE recommendations (
  id text PRIMARY KEY, date text, title text, evidence text, where_path text,
  status text, action_date text, outcome text, outcome_detail text, outcome_good boolean
);
CREATE TABLE alerts (
  id serial PRIMARY KEY, severity text, campaign text, rule text, value text, threshold text, ago text
);

INSERT INTO campaigns VALUES ('summer-sale','Summer Sale — Broad','meta','Active','Sales',4960,13890,2.3,1.42,2.18,318,72,'critical','⚠ 1 adset critical','[86,82,84,70,55,44,40]');
INSERT INTO campaigns VALUES ('retargeting','Retargeting — Cart','meta','Active','Sales',1980,11484,5.8,1.9,1.1,180,94,'good','Top performer','[30,36,42,50,58,70,78]');
INSERT INTO campaigns VALUES ('prospecting','Traffic — Prospecting','meta','Active','Traffic',3200,7680,2.4,1.4,1.9,96,88,'good','Stable','[48,50,46,52,50,54,52]');
INSERT INTO campaigns VALUES ('leadgen','Lead Gen Q3','li','Active','Leads',3100,3410,1.1,0.75,8.2,14,101,'critical','⚠ Below break-even','[55,50,44,46,38,32,28]');
INSERT INTO campaigns VALUES ('brand-li','Brand Awareness','li','Active','Awareness',980,2058,2.1,0.9,6.4,11,64,'good','Stable','[40,42,44,44,48,46,50]');
INSERT INTO campaigns VALUES ('holiday','Holiday Teaser','meta','Paused','Awareness',0,0,0,0,0,0,0,'paused','Paused Jun 18','[0,0,0,0,0,0,0]');
INSERT INTO campaigns VALUES ('c7','Sales Meta #7','meta','Active','Sales',4733,13252,2.8,1.25,2.38,130,86,'good','Stable','[54,56,65,68,69,72,78]');
INSERT INTO campaigns VALUES ('c8','Traffic Meta #8','meta','Paused','Traffic',320,1120,3.5,2.57,0.95,6,57,'good','Stable','[45,50,58,60,60,66,75]');
INSERT INTO campaigns VALUES ('c9','Leads Meta #9','meta','Paused','Leads',1961,8628,4.4,0.97,0.95,37,85,'good','Stable','[49,49,54,61,66,68,69]');
INSERT INTO campaigns VALUES ('c10','Awareness LI #10','li','Active','Awareness',688,1445,2.1,1.76,8.08,9,59,'watch','Watch','[53,54,45,42,38,38,36]');
INSERT INTO campaigns VALUES ('c11','Sales Meta #11','meta','Active','Sales',703,3374,4.8,2.77,1.63,11,64,'good','Stable','[58,57,68,68,75,75,80]');
INSERT INTO campaigns VALUES ('c12','Traffic Meta #12','meta','Active','Traffic',1979,6927,3.5,1.49,2.15,28,90,'good','Stable','[59,59,64,66,69,77,78]');
INSERT INTO campaigns VALUES ('c13','Leads Meta #13','meta','Active','Leads',787,3856,4.9,2.54,1.19,10,64,'good','Stable','[50,50,56,58,65,67,70]');
INSERT INTO campaigns VALUES ('c14','Awareness Meta #14','meta','Paused','Awareness',1997,9586,4.8,1.69,1.19,28,73,'good','Stable','[60,63,69,73,71,79,82]');
INSERT INTO campaigns VALUES ('c15','Sales LI #15','li','Paused','Sales',3969,3969,1,0.98,6.83,99,56,'critical','⚠ Needs attention','[59,53,53,44,41,41,36]');
INSERT INTO campaigns VALUES ('c16','Traffic Meta #16','meta','Active','Traffic',2475,6930,2.8,1.7,1.81,34,71,'good','Stable','[55,59,63,64,69,73,77]');
INSERT INTO campaigns VALUES ('c17','Leads Meta #17','meta','Active','Leads',1180,2124,1.8,1.53,1.17,30,57,'watch','Watch','[53,52,48,48,46,42,36]');
INSERT INTO campaigns VALUES ('c18','Awareness LI #18','li','Active','Awareness',3034,14260,4.7,2.19,7.35,105,86,'good','Stable','[57,62,68,75,75,82,86]');
INSERT INTO campaigns VALUES ('c19','Sales Meta #19','meta','Active','Sales',661,661,1,1.91,2.83,10,105,'critical','⚠ Needs attention','[40,39,36,31,26,24,24]');
INSERT INTO campaigns VALUES ('c20','Traffic Meta #20','meta','Paused','Traffic',5175,12420,2.4,1.56,3.33,178,73,'good','Stable','[49,51,49,47,44,38,36]');
INSERT INTO campaigns VALUES ('c21','Leads LI #21','li','Active','Leads',1024,2048,2,0.98,7.32,19,91,'watch','Watch','[38,30,31,27,23,20,17]');
INSERT INTO campaigns VALUES ('c22','Awareness Meta #22','meta','Active','Awareness',1899,4368,2.3,1.91,1.6,37,82,'good','Stable','[38,33,28,27,30,20,23]');
INSERT INTO campaigns VALUES ('c23','Sales Meta #23','meta','Active','Sales',814,2523,3.1,1.01,1.91,24,90,'good','Stable','[55,66,69,72,77,79,85]');
INSERT INTO campaigns VALUES ('c24','Traffic Meta #24','meta','Active','Traffic',706,1130,1.6,1.02,1.59,12,88,'watch','Watch','[41,30,30,27,23,25,19]');
INSERT INTO campaigns VALUES ('c25','Leads LI #25','li','Active','Leads',5251,26255,5,1.44,8.58,69,89,'good','Stable','[44,44,50,56,58,63,66]');
INSERT INTO campaigns VALUES ('c26','Awareness Meta #26','meta','Active','Awareness',5418,28174,5.2,1.52,2.69,90,98,'good','Stable','[60,60,68,68,72,77,84]');
INSERT INTO campaigns VALUES ('c27','Sales Meta #27','meta','Active','Sales',3896,18311,4.7,1.47,3.68,79,69,'good','Stable','[41,44,48,48,57,62,63]');
INSERT INTO campaigns VALUES ('c28','Traffic Meta #28','meta','Active','Traffic',2900,3190,1.1,2.25,2.06,62,86,'critical','⚠ Needs attention','[61,54,52,49,46,45,45]');
INSERT INTO campaigns VALUES ('c29','Leads Meta #29','meta','Active','Leads',741,2890,3.9,1.44,2.9,20,98,'good','Stable','[38,42,42,44,52,53,59]');
INSERT INTO campaigns VALUES ('c30','Awareness LI #30','li','Active','Awareness',4046,8092,2,1.38,7.78,152,94,'watch','Watch','[53,44,40,37,36,32,29]');
INSERT INTO campaigns VALUES ('c31','Sales Meta #31','meta','Active','Sales',4668,15871,3.4,2.2,0.9,73,95,'good','Stable','[42,51,52,53,57,66,68]');
INSERT INTO campaigns VALUES ('c32','Traffic Meta #32','meta','Paused','Traffic',2866,12610,4.4,1.25,1.24,54,89,'good','Stable','[65,64,68,76,79,83,84]');
INSERT INTO campaigns VALUES ('c33','Leads Meta #33','meta','Active','Leads',4175,12943,3.1,2.82,2.54,113,57,'good','Stable','[37,42,42,50,51,53,61]');
INSERT INTO campaigns VALUES ('c34','Awareness Meta #34','meta','Active','Awareness',4733,7573,1.6,1.17,3.78,145,79,'watch','Watch','[38,34,32,25,28,24,17]');
INSERT INTO campaigns VALUES ('c35','Sales LI #35','li','Active','Sales',4263,13215,3.1,1.37,6.76,85,57,'good','Stable','[46,51,53,59,60,69,68]');
INSERT INTO campaigns VALUES ('c36','Traffic Meta #36','meta','Active','Traffic',3721,15628,4.2,1.01,2.56,70,79,'good','Stable','[58,62,67,66,76,74,84]');
INSERT INTO campaigns VALUES ('c37','Leads LI #37','li','Paused','Leads',4074,10185,2.5,0.96,7.85,55,78,'good','Stable','[62,66,69,74,80,79,88]');
INSERT INTO campaigns VALUES ('c38','Awareness Meta #38','meta','Active','Awareness',4632,23623,5.1,0.92,3.53,195,81,'good','Stable','[50,53,57,63,66,72,76]');
INSERT INTO campaigns VALUES ('c39','Sales Meta #39','meta','Active','Sales',5279,23756,4.5,1.22,1.07,66,57,'good','Stable','[61,64,69,69,77,78,86]');
INSERT INTO campaigns VALUES ('c40','Traffic Meta #40','meta','Active','Traffic',1112,2113,1.9,2.35,0.95,39,67,'watch','Watch','[44,43,43,36,36,32,23]');
INSERT INTO campaigns VALUES ('c41','Leads Meta #41','meta','Active','Leads',1623,7628,4.7,2.7,2.2,38,97,'good','Stable','[50,55,60,68,65,73,72]');
INSERT INTO campaigns VALUES ('c42','Awareness Meta #42','meta','Active','Awareness',2556,11246,4.4,2.57,1.98,46,63,'good','Stable','[49,57,62,64,68,73,79]');
INSERT INTO campaigns VALUES ('c43','Sales Meta #43','meta','Paused','Sales',614,491,0.8,2.72,0.8,28,81,'critical','⚠ Needs attention','[39,35,27,27,27,21,16]');
INSERT INTO campaigns VALUES ('c44','Traffic Meta #44','meta','Active','Traffic',560,2072,3.7,2.08,3.35,10,76,'good','Stable','[52,58,58,62,70,75,75]');
INSERT INTO campaigns VALUES ('c45','Leads Meta #45','meta','Active','Leads',2541,12705,5,1.58,2.8,32,100,'good','Stable','[51,59,60,67,66,69,74]');
INSERT INTO campaigns VALUES ('c46','Awareness Meta #46','meta','Active','Awareness',5375,16663,3.1,2.2,2.61,68,68,'good','Stable','[32,42,41,47,50,52,57]');
INSERT INTO campaigns VALUES ('c47','Sales Meta #47','meta','Active','Sales',1943,6995,3.6,1.63,2.14,64,84,'good','Stable','[51,54,60,62,68,69,74]');
INSERT INTO campaigns VALUES ('c48','Traffic Meta #48','meta','Active','Traffic',3734,12696,3.4,1.72,1.32,184,91,'good','Stable','[51,53,58,66,67,69,76]');
INSERT INTO campaigns VALUES ('c49','Leads Meta #49','meta','Active','Leads',3984,5578,1.4,1.46,2.66,99,72,'critical','⚠ Needs attention','[40,40,31,29,27,29,25]');
INSERT INTO campaigns VALUES ('c50','Awareness Meta #50','meta','Active','Awareness',1206,3497,2.9,2.12,3.06,16,75,'good','Stable','[51,61,62,63,66,77,75]');
INSERT INTO campaigns VALUES ('c51','Sales Meta #51','meta','Active','Sales',3410,10912,3.2,1.95,2.83,66,100,'good','Stable','[60,65,75,74,81,84,87]');
INSERT INTO campaigns VALUES ('c52','Traffic Meta #52','meta','Active','Traffic',2047,5118,2.5,2.64,3.44,60,84,'good','Stable','[53,59,62,65,73,71,77]');
INSERT INTO campaigns VALUES ('c53','Leads LI #53','li','Active','Leads',552,828,1.5,1.08,8.3,11,78,'watch','Watch','[42,36,31,27,28,21,20]');
INSERT INTO campaigns VALUES ('c54','Awareness LI #54','li','Active','Awareness',4691,6098,1.3,0.64,8.84,207,93,'critical','⚠ Needs attention','[42,43,42,34,36,28,31]');
INSERT INTO campaigns VALUES ('c55','Sales Meta #55','meta','Paused','Sales',409,1104,2.7,1,1.95,8,75,'good','Stable','[50,52,52,55,59,67,72]');

INSERT INTO adsets VALUES ('female','summer-sale','18–34 Female','watch','Freq risk',1040,4576,4.4,2.3,1.1,8.2,142,94,'Best performer — approaching saturation','[1.9,2,2.1,2.2,2.3,2.35,2.3]','[12,11.5,11,10.8,10.8,11,11.4]','{"spend":"↑10%","revenue":"↑14%","roas":"↑0.3x","ctr":"↑0.2pts","cpc":"↓$0.20","freq":"↑2.1 — cap soon"}','{"tag":"watch","title":"Frequency warning","body":"Performing well at 4.4x ROAS but frequency 8.2 signals saturation (94% reach). Test fresh creative with the same 40% offer — estimated 4–6 days before CTR degrades."}');
INSERT INTO adsets VALUES ('male','summer-sale','25–44 Male','critical','Critical',880,1056,1.2,0.8,3.8,3.4,48,34,'ROAS crashed — creative fatigue','[1.7,1.6,1.4,1.1,0.95,0.85,0.8]','[14,15,16.5,17.5,18,18.2,18.3]','{"spend":"↓2%","revenue":"↓50%","roas":"↓1.2x","ctr":"↓0.8pts","cpc":"↑$2.60","freq":"healthy"}','{"tag":"issue","title":"Creative fatigue confirmed","body":"ROAS crashed 2.4x → 1.2x. Frequency is only 3.4 so this is NOT saturation — the “New Collection” video (freq 6.8, CTR 0.38%) is the culprit. Pause it and launch a static with a direct offer. Expected recovery: 2.0–2.8x within 7 days."}');
INSERT INTO adsets VALUES ('lla','summer-sale','Lookalike 1%','good','Good',540,1944,3.6,1.9,1.9,2.6,82,41,'Scale opportunity — 59% untouched','[1.6,1.65,1.7,1.75,1.8,1.85,1.9]','[11,10.9,10.7,10.6,10.5,10.4,10.4]','{"spend":"↓3%","revenue":"↑5%","roas":"↑0.2x","ctr":"↑0.1pts","cpc":"stable","freq":"headroom"}','{"tag":"rec","title":"Scale opportunity","body":"Healthiest adset — 59% of the audience untouched and ROAS improving. Increase budget $200–$400/day from the fatigued video''s spend. Projected: $640–$1,280 extra/week."}');
INSERT INTO adsets VALUES ('broad','summer-sale','Broad AU','good','Good',380,1102,2.9,1.5,2.4,2.2,46,22,'Stable baseline','[1.35,1.4,1.42,1.45,1.47,1.5,1.5]','[12.5,12.4,12.3,12.4,12.3,12.2,12.2]','{"spend":"↓13%","revenue":"↑2%","roas":"↑0.1x","ctr":"↑0.1pts","cpc":"stable","freq":"healthy"}','{"tag":"rec","title":"Stable performer","body":"Reliable at 2.9x ROAS. Static outperforms video 2:1. Test one fresh static next cycle; no urgent action."}');

INSERT INTO ads VALUES ('a1','female','Summer 40% — Static','Image',420,2.4,4.8,3.1,96,'Scale','top','#1');
INSERT INTO ads VALUES ('a2','female','Lifestyle — Carousel','Carousel',380,2.1,3.9,4.2,38,'Monitor','mid','#2');
INSERT INTO ads VALUES ('a3','female','Brand Story — Video','Video',240,1.6,2.1,5.8,8,'Pause','low','Weak');
INSERT INTO ads VALUES ('b1','male','New Collection — Video','Video',580,0.38,0.9,6.8,7,'Pause','low','Fatigue');
INSERT INTO ads VALUES ('b2','male','Product Demo — Video','Video',200,1.1,1.9,2.1,5,'Monitor','mid','#2');
INSERT INTO ads VALUES ('b3','male','Promo Static — Image','Image',100,1.8,2.4,1.2,2,'Scale','top','#1');
INSERT INTO ads VALUES ('c1','lla','Trending Carousel','Carousel',280,2.1,4.2,1.8,34,'Scale','top','#1');
INSERT INTO ads VALUES ('c2','lla','Summer Static','Image',180,1.8,3.1,1.4,16,'Monitor','mid','#2');
INSERT INTO ads VALUES ('c3','lla','Video Reel 15s','Video',80,1.2,2.8,1.1,4,'Monitor','mid','#3');
INSERT INTO ads VALUES ('d1','broad','Summer Static Wide','Image',200,1.7,3.4,1.8,26,'Monitor','top','#1');
INSERT INTO ads VALUES ('d2','broad','Brand Video 30s','Video',180,1.2,2.4,1.6,20,'Monitor','mid','#2');

INSERT INTO recommendations VALUES ('r1','Jul 2','Pause “New Collection” video','Creative fatigue — freq 6.8, CTR 0.38%','Summer Sale › 25–44 M','followed','Jul 3','ROAS 1.2x → 2.1x','+75% in 6 days · saved ~$83/day',true);
INSERT INTO recommendations VALUES ('r2','Jul 2','Shift $300/day to Lookalike 1%','Scale opportunity — 59% audience untouched','Summer Sale › LLA 1%','followed','Jul 4','+$618/wk revenue','ROAS held at 3.5x while scaling',true);
INSERT INTO recommendations VALUES ('r3','Jul 8','Frequency cap at 6 for 18–34 Female','Saturation risk — freq 8.2, reach 94%','Summer Sale › 18–34 F','pending',NULL,'Awaiting action','Est. impact: protect $4.4k/mo revenue',NULL);
INSERT INTO recommendations VALUES ('r4','Jun 24','Reduce LinkedIn Lead Gen budget 40%','Below break-even — ROAS 1.1x, CPA $217','Lead Gen Q3','ignored',NULL,'−$1,240 since','ROAS still 1.1x — rec stands',false);
INSERT INTO recommendations VALUES ('r5','Jun 20','Test static testimonial creative','Video underperforming for 25–44 M','Summer Sale › 25–44 M','followed','Jun 23','CTR 0.9% → 1.8%','New static is now #1 ad in adset',true);

INSERT INTO alerts (severity,campaign,rule,value,threshold,ago) VALUES ('Critical','Summer Sale','ROAS too low','1.2x','1.5x','2h ago');
INSERT INTO alerts (severity,campaign,rule,value,threshold,ago) VALUES ('Critical','Summer Sale','CTR too low','0.6%','1.0%','2h ago');
INSERT INTO alerts (severity,campaign,rule,value,threshold,ago) VALUES ('Warning','Lead Gen Q3','CPC spike','$8.20','$5.00','5h ago');

-- sanity check
SELECT (SELECT count(*) FROM campaigns) AS campaigns,
       (SELECT count(*) FROM adsets) AS adsets,
       (SELECT count(*) FROM ads) AS ads,
       (SELECT count(*) FROM recommendations) AS recs,
       (SELECT count(*) FROM alerts) AS alerts;
