// Final pixel composite at 192x108:
//   scene (colour-graded during ults) -> FX layer over it (stays bright) -> water reflection below the
//   waterline (mirrored, rippled per row, tinted) -> full-screen flash.
Shader "Hidden/PixelComposite"
{
    Properties
    {
        _MainTex ("Scene", 2D) = "black" {}
        _FxTex ("FX", 2D) = "black" {}
        _Grade ("Grade (rgb, amount in a)", Color) = (0, 0, 0, 0)
        _Flash ("Flash", Float) = 0
        _T ("Time", Float) = 0
        _Fade ("Fade to black", Float) = 0
        _WaterRow ("Water row from top", Float) = 9999
    }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex, _FxTex;
            float4 _Grade;
            float _Flash, _T, _Fade, _WaterRow;
            static const float2 RES = float2(320, 180);

            float3 Layered(float2 px)
            {
                float2 uv = (px + 0.5) / RES;
                float3 c = tex2D(_MainTex, uv).rgb;
                c = lerp(c, _Grade.rgb, _Grade.a);
                float4 f = tex2D(_FxTex, uv);
                return lerp(c, f.rgb, f.a);
            }

            fixed4 frag (v2f_img i) : SV_Target
            {
                float2 px = floor(i.uv * RES);
                float row = RES.y - 1 - px.y;              // 0 = top row
                float3 c;
                float WY = floor(_WaterRow);
                if (row >= WY && row < RES.y)
                {
                    float depth = row - WY;
                    float src = 2 * WY - 1 - row;
                    float amp = 0.5 + depth * 0.055;
                    float dx = round(sin(row * 0.8 - _T * 2.4) * amp + sin(row * 0.33 + _T * 1.3) * 0.6);
                    float sx = clamp(px.x + dx, 0, RES.x - 1);
                    c = Layered(float2(sx, RES.y - 1 - src));
                    c = lerp(c, float3(12, 22, 48) / 255.0, 0.56);
                }
                else c = Layered(px);
                c = lerp(c, float3(1, 1, 1), _Flash);
                c = lerp(c, float3(0.027, 0.024, 0.06), _Fade);
                return fixed4(c, 1);
            }
            ENDCG
        }
    }
}
