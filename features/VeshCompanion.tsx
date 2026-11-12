
"use client";

import type { CSSProperties } from "react";
import type { CompanionState } from "@/features/companion";

type VeshCompanionProps = {
  state: CompanionState;
};

export default function VeshCompanion({ state }: VeshCompanionProps) {
  return (
    <div
      className={`companion companion--${state}`}
      data-state={state}
      role="img"
      aria-label={`VESH digital companion, ${state} state`}
    >
      {/* Ambient presence */}
      <div className="companion__halo" />
      <div className="companion__orbit companion__orbit--one" />
      <div className="companion__orbit companion__orbit--two" />

      {/* Ambient particles */}
      <div className="companion__particles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="companion__particle"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>

      <svg
        className="companion__figure"
        viewBox="0 0 300 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="veshArmor"
            x1="64"
            y1="50"
            x2="237"
            y2="320"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E7F4FF" />
            <stop offset=".42" stopColor="#91AFC7" />
            <stop offset="1" stopColor="#263F58" />
          </linearGradient>

          <linearGradient
            id="veshVisor"
            x1="85"
            y1="75"
            x2="215"
            y2="168"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#152D44" />
            <stop offset=".5" stopColor="#091827" />
            <stop offset="1" stopColor="#203B52" />
          </linearGradient>

          <linearGradient
            id="veshCore"
            x1="150"
            y1="190"
            x2="150"
            y2="280"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#8BEAFF" />
            <stop offset="1" stopColor="#2388C7" />
          </linearGradient>

          <radialGradient id="veshCoreGlow">
            <stop stopColor="#8BEAFF" stopOpacity=".75" />
            <stop offset="1" stopColor="#2388C7" stopOpacity="0" />
          </radialGradient>

          <filter
            id="veshGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="5" />
          </filter>

          <filter
            id="veshSoftGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* BODY */}
        <g className="companion__body">
          {/* Neck */}
          <path
            d="M126 166 L126 195 L174 195 L174 166"
            fill="#47657E"
            stroke="#B6D5EA"
            strokeOpacity=".55"
          />

          {/* Main torso */}
          <path
            d="M124 184
              C100 186 76 197 63 220
              L43 291
              Q40 306 55 310
              L245 310
              Q260 306 257 291
              L237 220
              C224 197 200 186 176 184
              L164 207
              L136 207 Z"
            fill="url(#veshArmor)"
            stroke="#B6D5EA"
            strokeOpacity=".65"
            strokeWidth="1.4"
          />

          {/* Shoulder panels */}
          <path
            d="M78 218 L108 205 L95 265 L60 284 Z"
            fill="#7896AE"
            stroke="#C7E3F6"
            strokeOpacity=".4"
          />

          <path
            d="M222 218 L192 205 L205 265 L240 284 Z"
            fill="#7896AE"
            stroke="#C7E3F6"
            strokeOpacity=".4"
          />

          {/* Energy core outer glow */}
          <circle
            className="companion__core-glow"
            cx="150"
            cy="240"
            r="37"
            fill="url(#veshCoreGlow)"
            filter="url(#veshGlow)"
          />

          <circle
            cx="150"
            cy="240"
            r="31"
            fill="#54D6FF"
            opacity=".22"
            filter="url(#veshGlow)"
          />

          {/* Core housing */}
          <path
            d="M150 211 L171 223 L171 247 L150 259 L129 247 L129 223 Z"
            fill="#122F47"
            stroke="#86E8FF"
            strokeOpacity=".8"
          />

          {/* Core center */}
          <path
            className="companion__core"
            d="M150 219 L163 227 L163 243 L150 251 L137 243 L137 227 Z"
            fill="url(#veshCore)"
          />

          <circle
            className="companion__core-center"
            cx="150"
            cy="235"
            r="4"
            fill="#F0FDFF"
          />

          {/* Collar */}
          <path
            d="M124 188 L150 204 L176 188"
            stroke="#BFEAFF"
            strokeOpacity=".75"
            strokeWidth="1.5"
          />
        </g>

        {/* HEAD — independently animated */}
        <g className="companion__head">
          {/* Outer head silhouette */}
          <path
            d="M150 25
              C105 25 78 55 78 100
              L78 128
              Q78 151 98 165
              L123 181
              Q150 193 177 181
              L202 165
              Q222 151 222 128
              L222 100
              C222 55 195 25 150 25 Z"
            fill="url(#veshArmor)"
            stroke="#D2E7F8"
            strokeWidth="1.5"
          />

          {/* Visor */}
          <path
            d="M83 93
              Q85 64 112 57
              Q150 45 188 57
              Q215 64 217 93
              L211 126
              Q207 145 187 154
              L169 162
              Q150 168 131 162
              L113 154
              Q93 145 89 126 Z"
            fill="url(#veshVisor)"
            stroke="#8ABBD7"
            strokeOpacity=".75"
          />

          {/* Visor reflection */}
          <path
            d="M100 84 Q126 62 156 63"
            stroke="#D1F7FF"
            strokeOpacity=".3"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Subtle secondary reflection */}
          <path
            d="M97 91 Q107 83 119 78"
            stroke="#A6DDF2"
            strokeOpacity=".15"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* EYES */}
          <g className="companion__eyes">
            {/* Left eye glow */}
            <path
              className="companion__eye-glow"
              d="M105 107 Q120 96 135 107"
              stroke="#52DFFF"
              strokeWidth="9"
              strokeLinecap="round"
              filter="url(#veshSoftGlow)"
            />

            {/* Right eye glow */}
            <path
              className="companion__eye-glow"
              d="M165 107 Q180 96 195 107"
              stroke="#52DFFF"
              strokeWidth="9"
              strokeLinecap="round"
              filter="url(#veshSoftGlow)"
            />

            {/* Left eye */}
            <path
              className="companion__eye companion__eye--left"
              d="M105 107 Q120 96 135 107"
              stroke="#52DFFF"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Right eye */}
            <path
              className="companion__eye companion__eye--right"
              d="M165 107 Q180 96 195 107"
              stroke="#52DFFF"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Listening eye highlights */}
            <circle
              className="companion__eye-highlight companion__eye-highlight--left"
              cx="120"
              cy="104"
              r="2"
              fill="#E6FCFF"
            />

            <circle
              className="companion__eye-highlight companion__eye-highlight--right"
              cx="180"
              cy="104"
              r="2"
              fill="#E6FCFF"
            />
          </g>

          {/* FACIAL EXPRESSIONS */}

          {/* Ambient expression */}
          <path
            className="companion__mouth companion__mouth--ambient"
            d="M136 137 Q150 144 164 137"
            stroke="#8DC5E2"
            strokeOpacity=".65"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Listening expression */}
          <path
            className="companion__mouth companion__mouth--listening"
            d="M138 139 Q150 141 162 139"
            stroke="#A6DFF3"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Thinking expression */}
          <path
            className="companion__mouth companion__mouth--thinking"
            d="M139 140 L161 140"
            stroke="#A6DFF3"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Speaking expression */}
          <path
            className="companion__mouth companion__mouth--speaking"
            d="M139 140 Q150 145 161 140"
            fill="none"
            stroke="#9BEAFF"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Working expression */}
          <path
            className="companion__mouth companion__mouth--working"
            d="M139 140 Q150 138 161 140"
            stroke="#8DC5E2"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Attention expression */}
          <path
            className="companion__mouth companion__mouth--attention"
            d="M138 137 Q150 146 162 137"
            stroke="#A6EFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Temple lights */}
          <g className="companion__temples">
            <path
              d="M83 105 L83 125 M217 105 L217 125"
              stroke="#75DFFF"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      {/* Ground illumination */}
      <div className="companion__ground-light" />
    </div>
  );
}
