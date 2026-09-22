import React from 'react';

/**
 * PackagingSketches component renders the high-fidelity technical packaging
 * blueprint illustrations and organic leaves seen in the reference mockup.
 * Drawn with crisp SVG vector paths, dimension arrows, and hand-annotated callouts.
 */
export default function PackagingSketches() {
  return (
    <div className="auth-blueprint-bg" aria-hidden="true">
      <svg
        className="auth-blueprint-svg"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle line pattern grid */}
          <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.75" fill="#008767" opacity="0.07" />
          </pattern>

          {/* Organic background gradient waves */}
          <radialGradient id="mintGlow1" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#D4F3E6" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#E9F7F1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mintGlow2" cx="75%" cy="80%" r="45%">
            <stop offset="0%" stopColor="#CEF0E1" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#E6F5EE" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F4FAF7" stopOpacity="0" />
          </radialGradient>

          {/* Leaf Gradients */}
          <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52C498" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#1E825B" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7CD9B2" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#2E9E70" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Ambient background mint washes */}
        <rect width="1440" height="900" fill="#F4FAF7" />
        <rect width="1440" height="900" fill="url(#grid-dots)" />
        <circle cx="420" cy="280" r="480" fill="url(#mintGlow1)" />
        <circle cx="1100" cy="720" r="450" fill="url(#mintGlow2)" />

        {/* Soft organic curved wave ribbons in background */}
        <path
          d="M-50,650 C240,680 480,560 700,680 C920,800 1180,720 1490,820 L1490,950 L-50,950 Z"
          fill="#E7F6F0"
          opacity="0.6"
        />
        <path
          d="M-50,780 C320,720 620,860 920,760 C1140,680 1320,740 1490,700 L1490,950 L-50,950 Z"
          fill="#D6F2E5"
          opacity="0.4"
        />

        {/* ──────────────────────────────────────────────────────────
            1. MONOCARTON DESIGN (Isometric box top center)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group monocarton" stroke="#3D6873" strokeWidth="1.25" opacity="0.55">
          {/* Main box outer isometric body */}
          <path d="M510,135 L620,85 L720,135 L610,185 Z" fill="#FFFFFF" fillOpacity="0.5" />
          <path d="M510,135 L510,340 L610,390 L610,185 Z" fill="#F8FCFA" fillOpacity="0.4" />
          <path d="M610,185 L610,390 L720,340 L720,135 Z" fill="#EBF4F0" fillOpacity="0.4" />

          {/* Open Top Flaps */}
          {/* Back Left Flap */}
          <path d="M510,135 L475,70 L575,30 L620,85 Z" strokeDasharray="3 2" />
          {/* Back Right Flap */}
          <path d="M620,85 L645,20 L745,55 L720,135 Z" />
          {/* Front Left Flap */}
          <path d="M510,135 L490,230 L590,265 L610,185 Z" strokeDasharray="4 2" />
          {/* Front Right Flap */}
          <path d="M610,185 L640,270 L730,225 L720,135 Z" />

          {/* Crease fold lines & isometric inner edges */}
          <line x1="510" y1="135" x2="610" y2="185" stroke="#3D6873" strokeDasharray="2 2" />
          <line x1="610" y1="185" x2="720" y2="135" stroke="#3D6873" strokeDasharray="2 2" />

          {/* Dimension arrows and leaders */}
          <g stroke="#26786A" strokeWidth="0.8" opacity="0.75">
            {/* Height dimension leader */}
            <line x1="490" y1="135" x2="490" y2="340" />
            <line x1="482" y1="135" x2="498" y2="135" />
            <line x1="482" y1="340" x2="498" y2="340" />
            <path d="M490,135 L488,143 M490,135 L492,143" />
            <path d="M490,340 L488,332 M490,340 L492,332" />
            <text x="475" y="240" fill="#26786A" fontSize="10" fontFamily="'Caveat', 'Segoe Print', cursive, sans-serif" transform="rotate(-90 475 240)">38 mm</text>

            {/* Width dimension leader */}
            <line x1="510" y1="365" x2="610" y2="415" />
            <line x1="504" y1="358" x2="516" y2="372" />
            <line x1="604" y1="408" x2="616" y2="422" />
            <text x="555" y="405" fill="#26786A" fontSize="10" fontFamily="'Caveat', 'Segoe Print', cursive, sans-serif" transform="rotate(26 555 405)">88 mm</text>
          </g>
        </g>

        {/* Monocarton Callout Annotation */}
        <g opacity="0.65">
          <path
            d="M740,150 C760,135 770,120 755,95 C750,85 730,95 725,100"
            fill="none"
            stroke="#26786A"
            strokeWidth="1.2"
          />
          <text
            x="745"
            y="95"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
          >
            Monocarton
          </text>
          <text
            x="765"
            y="114"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
          >
            Design
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            2. POUCH STRUCTURE (Center standup barrier pouch)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group pouch" stroke="#3D6873" strokeWidth="1.2" opacity="0.55">
          {/* Pouch outer contour */}
          <path
            d="M515,445 L505,710 C505,735 635,745 645,710 L635,445 Z"
            fill="#FFFFFF"
            fillOpacity="0.45"
          />
          {/* Top heat-seal banner */}
          <path d="M515,445 L635,445 L633,475 L517,475 Z" strokeDasharray="3 1.5" />
          {/* Tear notches */}
          <path d="M515,462 L523,462 L517,466" />
          <path d="M635,462 L627,462 L633,466" />
          {/* Ziplock profile lines */}
          <line x1="520" y1="490" x2="630" y2="490" strokeDasharray="2 2" stroke="#26786A" />

          {/* Vertical center contour reflection line */}
          <path d="M570,480 C565,580 568,660 575,720" stroke="#3D6873" strokeDasharray="4 3" opacity="0.6" />

          {/* Bottom Standup Gusset Oval */}
          <ellipse cx="570" cy="710" rx="65" ry="16" fill="none" strokeDasharray="3 2" />

          {/* Hatching texture for flexible film reflection */}
          <g stroke="#3D6873" strokeWidth="0.6" opacity="0.3">
            <line x1="525" y1="520" x2="545" y2="570" />
            <line x1="535" y1="515" x2="555" y2="565" />
            <line x1="545" y1="510" x2="565" y2="560" />
          </g>
        </g>

        {/* Pouch Structure Callout */}
        <g opacity="0.65">
          <path
            d="M485,630 C465,640 450,650 475,665"
            fill="none"
            stroke="#26786A"
            strokeWidth="1.2"
          />
          <text
            x="440"
            y="675"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
            transform="rotate(-12 440 675)"
          >
            Pouch
          </text>
          <text
            x="445"
            y="695"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            transform="rotate(-12 445 695)"
          >
            Structure
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            3. BOTTLE DESIGN (Right tall beverage/dispenser bottle)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group bottle" stroke="#3D6873" strokeWidth="1.2" opacity="0.55">
          {/* Bottle body */}
          <path
            d="M690,560 C680,575 675,600 675,640 L675,765 C675,785 765,785 765,765 L765,640 C765,600 760,575 750,560 Z"
            fill="#FFFFFF"
            fillOpacity="0.4"
          />
          {/* Bottle neck & threads */}
          <rect x="702" y="525" width="36" height="35" rx="3" fill="#FFFFFF" fillOpacity="0.5" />
          <line x1="702" y1="535" x2="738" y2="535" strokeDasharray="2 1.5" />
          <line x1="702" y1="545" x2="738" y2="545" strokeDasharray="2 1.5" />

          {/* Screw Cap with knurling */}
          <path d="M698,495 L742,495 L742,525 L698,525 Z" fill="#F8FCFA" fillOpacity="0.6" />
          <g stroke="#3D6873" strokeWidth="0.8" opacity="0.7">
            <line x1="704" y1="496" x2="704" y2="524" />
            <line x1="710" y1="496" x2="710" y2="524" />
            <line x1="716" y1="496" x2="716" y2="524" />
            <line x1="724" y1="496" x2="724" y2="524" />
            <line x1="730" y1="496" x2="730" y2="524" />
            <line x1="736" y1="496" x2="736" y2="524" />
          </g>

          {/* Bottle shoulder contour ring */}
          <ellipse cx="720" cy="565" rx="30" ry="6" strokeDasharray="3 2" />
          {/* Label area outline */}
          <path d="M676,620 L764,620 M676,715 L764,715" strokeDasharray="2 2" stroke="#26786A" />

          {/* Bottle base curves */}
          <ellipse cx="720" cy="765" rx="44" ry="10" fill="none" />
        </g>

        {/* Bottle Design Callout */}
        <g opacity="0.65">
          <path
            d="M745,435 C755,420 745,395 725,410"
            fill="none"
            stroke="#26786A"
            strokeWidth="1.2"
          />
          <text
            x="715"
            y="375"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
            transform="rotate(6 715 375)"
          >
            Bottle
          </text>
          <text
            x="725"
            y="395"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            transform="rotate(6 725 395)"
          >
            Design
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            4. LABEL DESIGN (Roll of sticker labels peeling off)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group label-roll" stroke="#3D6873" strokeWidth="1.2" opacity="0.55">
          {/* Core spool cylinder */}
          <ellipse cx="180" cy="735" rx="42" ry="58" fill="#F8FCFA" fillOpacity="0.4" />
          <ellipse cx="180" cy="735" rx="18" ry="26" fill="none" strokeDasharray="2 2" />

          {/* Roll body extruded back */}
          <path
            d="M180,677 L245,715 C285,735 285,795 245,815 L180,793"
            fill="none"
          />
          <ellipse cx="245" cy="765" rx="40" ry="50" fill="none" strokeDasharray="3 2" />

          {/* Unrolled strip of labels */}
          <path
            d="M205,790 C260,805 320,810 395,800 L445,860 C360,875 280,865 210,830 Z"
            fill="#FFFFFF"
            fillOpacity="0.5"
          />
          {/* Die-cut labels on backing tape */}
          <rect
            x="240"
            y="795"
            width="55"
            height="38"
            rx="5"
            transform="rotate(10 240 795)"
            stroke="#26786A"
            strokeWidth="1.1"
          />
          <rect
            x="320"
            y="808"
            width="55"
            height="38"
            rx="5"
            transform="rotate(8 320 808)"
            stroke="#26786A"
            strokeWidth="1.1"
          />
        </g>

        {/* Label Design Callout */}
        <g opacity="0.65">
          <path
            d="M320,725 C305,745 285,750 265,755"
            fill="none"
            stroke="#26786A"
            strokeWidth="1.2"
          />
          <text
            x="315"
            y="695"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
            transform="rotate(-8 315 695)"
          >
            Label
          </text>
          <text
            x="320"
            y="715"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            transform="rotate(-8 320 715)"
          >
            Design
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            5. CAP DETAILS (Ribbed cap bottom center)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group cap-details" stroke="#3D6873" strokeWidth="1.2" opacity="0.55">
          <ellipse cx="495" cy="750" rx="42" ry="14" fill="#FFFFFF" fillOpacity="0.5" />
          <path d="M453,750 L453,815 C453,828 537,828 537,815 L537,750" fill="none" />
          <ellipse cx="495" cy="815" rx="42" ry="13" fill="none" />

          {/* Knurled vertical serrations */}
          <g stroke="#3D6873" strokeWidth="0.9" opacity="0.65">
            <line x1="460" y1="755" x2="460" y2="817" />
            <line x1="468" y1="758" x2="468" y2="822" />
            <line x1="477" y1="761" x2="477" y2="825" />
            <line x1="486" y1="763" x2="486" y2="827" />
            <line x1="495" y1="764" x2="495" y2="828" />
            <line x1="504" y1="763" x2="504" y2="827" />
            <line x1="513" y1="761" x2="513" y2="825" />
            <line x1="522" y1="758" x2="522" y2="822" />
            <line x1="530" y1="755" x2="530" y2="817" />
          </g>

          {/* Cap dimension arrow */}
          <g stroke="#26786A" strokeWidth="0.8" opacity="0.7">
            <line x1="440" y1="750" x2="440" y2="815" />
            <line x1="435" y1="750" x2="445" y2="750" />
            <line x1="435" y1="815" x2="445" y2="815" />
            <line x1="453" y1="840" x2="537" y2="840" />
          </g>
        </g>

        {/* Cap Details Callout */}
        <g opacity="0.65">
          <text
            x="560"
            y="790"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
          >
            Cap
          </text>
          <text
            x="560"
            y="810"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
          >
            Details
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            6. DIELINE READY (Unfolded flat carton template bottom right)
        ────────────────────────────────────────────────────────── */}
        <g className="sketch-group dieline" stroke="#3D6873" strokeWidth="1" opacity="0.5">
          {/* Main 4 carton panels unfolded */}
          <g transform="translate(770, 810) rotate(-18) scale(0.85)">
            {/* Glue flap */}
            <path d="M0,40 L25,48 L25,122 L0,130 Z" fill="#F8FCFA" fillOpacity="0.4" />
            {/* Panel 1 */}
            <rect x="25" y="48" width="70" height="74" fill="#FFFFFF" fillOpacity="0.4" strokeDasharray="3 2" />
            {/* Panel 2 */}
            <rect x="95" y="48" width="50" height="74" fill="#FFFFFF" fillOpacity="0.4" />
            {/* Panel 3 */}
            <rect x="145" y="48" width="70" height="74" fill="#FFFFFF" fillOpacity="0.4" strokeDasharray="3 2" />
            {/* Panel 4 */}
            <rect x="215" y="48" width="50" height="74" fill="#FFFFFF" fillOpacity="0.4" />

            {/* Top tuck flap & dust flaps */}
            <path d="M25,48 L35,10 C50,0 70,0 85,10 L95,48 Z" />
            <path d="M95,48 L105,25 L140,25 L145,48 Z" strokeDasharray="2 2" />
            <path d="M145,48 L155,10 C170,0 190,0 205,10 L215,48 Z" />
            <path d="M215,48 L225,25 L260,25 L265,48 Z" strokeDasharray="2 2" />

            {/* Bottom snap lock closure flaps */}
            <path d="M25,122 L35,160 L85,160 L95,122 Z" />
            <path d="M95,122 L110,155 L135,155 L145,122 Z" />
            <path d="M145,122 L155,160 L205,160 L215,122 Z" />
            <path d="M215,122 L230,155 L255,155 L265,122 Z" />
          </g>
        </g>

        {/* Dieline Ready Callout */}
        <g opacity="0.65">
          <path
            d="M1090,890 C1105,870 1115,855 1105,835"
            fill="none"
            stroke="#26786A"
            strokeWidth="1.2"
          />
          <text
            x="1105"
            y="850"
            fill="#26786A"
            fontSize="15"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
            fontWeight="600"
          >
            Dieline
          </text>
          <text
            x="1115"
            y="870"
            fill="#26786A"
            fontSize="14"
            fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
            fontStyle="italic"
          >
            Ready
          </text>
        </g>

        {/* ──────────────────────────────────────────────────────────
            7. ORGANIC LEAVES (Botanical leaves floating)
        ────────────────────────────────────────────────────────── */}
        {/* Leaf 1 (Top Left near monocarton) */}
        <g transform="translate(520, 240) rotate(-28) scale(0.65)">
          <path
            d="M0,0 C25,-35 70,-40 95,-15 C105,15 80,55 0,0 Z"
            fill="url(#leafGrad1)"
          />
          <path d="M0,0 C40,-10 75,-8 95,-15" stroke="#166542" strokeWidth="1.2" opacity="0.6" />
        </g>

        {/* Leaf 2 (Center near pouch) */}
        <g transform="translate(650, 715) rotate(35) scale(0.75)">
          <path
            d="M0,0 C30,-40 85,-45 110,-20 C120,15 90,65 0,0 Z"
            fill="url(#leafGrad2)"
          />
          <path d="M0,0 C45,-12 85,-10 110,-20" stroke="#166542" strokeWidth="1.2" opacity="0.6" />
        </g>

        {/* Leaf 3 (Top right edge) */}
        <g transform="translate(1220, 160) rotate(70) scale(0.7)">
          <path
            d="M0,0 C28,-36 75,-42 100,-18 C110,12 85,58 0,0 Z"
            fill="url(#leafGrad1)"
          />
          <path d="M0,0 C40,-10 80,-8 100,-18" stroke="#166542" strokeWidth="1.2" opacity="0.6" />
        </g>

        {/* Leaf 4 (Far left bottom near brand anchor) */}
        <g transform="translate(90, 840) rotate(-15) scale(0.55)">
          <path
            d="M0,0 C25,-30 65,-35 85,-15 C95,10 75,45 0,0 Z"
            fill="url(#leafGrad2)"
          />
          <path d="M0,0 C35,-8 68,-7 85,-15" stroke="#166542" strokeWidth="1" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
