using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

// Headless project setup + builds:  Unity -batchmode -executeMethod Setup.BuildWin | Setup.BuildWeb
public static class Setup
{
    const string ScenePath = "Assets/Scenes/Main.unity";

    [MenuItem("Shadow Strike/Setup Project")]
    public static void Run()
    {
        var tm = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);
        var layers = tm.FindProperty("layers");
        layers.GetArrayElementAtIndex(8).stringValue = "FX";
        layers.GetArrayElementAtIndex(9).stringValue = "HUD";
        tm.ApplyModifiedProperties();

        PlayerSettings.companyName = "fal";
        PlayerSettings.productName = "Shadow Strike";
        PlayerSettings.defaultScreenWidth = 1280;
        PlayerSettings.defaultScreenHeight = 720;
        PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
        PlayerSettings.resizableWindow = true;
        PlayerSettings.runInBackground = true;
        PlayerSettings.visibleInBackground = true;
        PlayerSettings.colorSpace = ColorSpace.Gamma;
        PlayerSettings.defaultWebScreenWidth = 960;
        PlayerSettings.defaultWebScreenHeight = 540;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.decompressionFallback = true;   // decompress in JS so any static host works
        PlayerSettings.WebGL.dataCaching = false;

        Directory.CreateDirectory("Assets/Scenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("Game").AddComponent<Game>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
        Debug.Log("[Setup] project configured");
    }

    static void Build(BuildTarget target, string path)
    {
        Run();
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, locationPathName = path, target = target, options = BuildOptions.None });
        Debug.Log("[Setup] build " + target + ": " + r.summary.result + " " + r.summary.totalSize + " bytes, " + r.summary.totalErrors + " errors");
        if (r.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
    public static void BuildWin() { Build(BuildTarget.StandaloneWindows64, "Builds/Win/ShadowStrike.exe"); }
    public static void BuildWeb() { Build(BuildTarget.WebGL, "Builds/WebGL"); }
}
